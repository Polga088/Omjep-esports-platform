import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';

export type PotsValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Règles d'intégrité des chapeaux pour le tirage UCL (CHAMPIONS).
 *
 * 1. Exhaustivité : chaque équipe inscrite (CompetitionTeam) apparaît dans exactement un pot.
 * 2. Unicité : aucune équipe dans deux chapeaux différents.
 * 3. Format : pour 8 équipes, 2×4 ou 4×2 ; sinon 4 chapeaux de taille égale à ceil(n/4) (schéma standard).
 */
@Injectable()
export class DrawService {
  constructor(private readonly prisma: PrismaService) {}

  async validatePotsIntegrity(
    competitionId: string,
    pots: string[][],
  ): Promise<PotsValidationResult> {
    const errors: string[] = [];

    if (!pots || pots.length < 1) {
      return { valid: false, errors: ['Au moins un chapeau est requis.'] };
    }

    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        teams: { include: { team: { select: { id: true, name: true } } } },
      },
    });

    if (!competition) {
      return { valid: false, errors: ['Compétition introuvable.'] };
    }

    if (competition.type !== 'CHAMPIONS') {
      return {
        valid: false,
        errors: ["La validation des chapeaux ne s'applique qu'aux compétitions Champions."],
      };
    }

    const teamNameById = new Map(
      competition.teams.map((ct) => [ct.team_id, ct.team.name] as const),
    );
    const registeredIds = new Set(teamNameById.keys());
    const totalTeams = registeredIds.size;

    const flat = pots.flat();
    const counts = new Map<string, number>();

    for (const id of flat) {
      if (typeof id !== 'string' || !id) {
        errors.push('Identifiant d’équipe invalide dans les chapeaux.');
        continue;
      }
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (!registeredIds.has(id)) {
        errors.push(
          `Erreur : une équipe inconnue ou non inscrite figure dans les chapeaux (${id}).`,
        );
      }
    }

    for (const [id, n] of counts) {
      if (n > 1) {
        const name = teamNameById.get(id) ?? id;
        errors.push(
          `Erreur : L'équipe ${name} est présente dans plusieurs chapeaux.`,
        );
      }
    }

    const assigned = new Set(counts.keys());
    for (const id of registeredIds) {
      if (!assigned.has(id)) {
        const name = teamNameById.get(id) ?? id;
        errors.push(
          `Erreur : L'équipe ${name} n'est affectée à aucun chapeau.`,
        );
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    if (flat.length !== totalTeams) {
      return {
        valid: false,
        errors: [
          `Le nombre d'équipes dans les chapeaux (${flat.length}) ne correspond pas aux inscriptions (${totalTeams}).`,
        ],
      };
    }

    const structureErrors = this.validatePotsStructure(totalTeams, pots);
    if (structureErrors.length > 0) {
      return { valid: false, errors: structureErrors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Règle 3 — formats acceptés pour une UCL.
   * - 8 équipes : 2 pots de 4 ou 4 pots de 2.
   * - Autres effectifs : 4 chapeaux de même taille = ceil(n/4), somme = n.
   */
  private validatePotsStructure(totalTeams: number, pots: string[][]): string[] {
    const sum = pots.reduce((acc, p) => acc + p.length, 0);

    if (sum !== totalTeams) {
      return [
        `La somme des équipes dans les chapeaux (${sum}) doit égaler le nombre d'équipes inscrites (${totalTeams}).`,
      ];
    }

    if (totalTeams === 8) {
      const nonEmpty = pots.filter((p) => p.length > 0);
      const lengths = nonEmpty.map((p) => p.length);
      const okTwoByFour =
        nonEmpty.length === 2 && lengths.every((l) => l === 4);
      const okFourByTwo =
        nonEmpty.length === 4 && lengths.every((l) => l === 2);
      if (!okTwoByFour && !okFourByTwo) {
        return [
          'Pour une compétition à 8 équipes, utilisez 2 chapeaux de 4 équipes ou 4 chapeaux de 2 équipes.',
        ];
      }
      return [];
    }

    const potSize = Math.ceil(totalTeams / 4);
    if (4 * potSize !== totalTeams) {
      return [
        `Effectif incompatible avec le format 4 chapeaux équilibrés : ${totalTeams} équipes inscrites (attendu un multiple de la taille de chapeau × 4).`,
      ];
    }

    const okFourPots =
      pots.length === 4 && pots.every((p) => p.length === potSize);
    if (!okFourPots) {
      return [
        `Format attendu : 4 chapeaux de ${potSize} équipe(s) chacun (total ${totalTeams} équipes).`,
      ];
    }

    return [];
  }
}
