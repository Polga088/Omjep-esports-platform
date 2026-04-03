import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { BracketAdvanceSlot } from '@omjep/database';
import { Prisma } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  buildCrossGroupPairings,
  computeGroupStandings,
  isGroupPhaseRound,
  isPowerOfTwo,
  parseGroupLetter,
  type StandingTeam,
} from './groups-to-knockout.util';

/** Club technique pour les emplacements bracket encore inconnus. */
export const BRACKET_PLACEHOLDER_CLUB_NAME = 'OMJEP_BRACKET_TBD';

function nextPow2(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

function roundLabelForBracket(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIndex;
  if (fromEnd === 1) return 'Finale';
  if (fromEnd === 2) return 'Demi-finales';
  if (fromEnd === 3) return 'Quarts de finale';
  if (fromEnd === 4) return 'Huitièmes de finale';
  return `Tour ${roundIndex + 1}`;
}

/**
 * Remplit le tableau de taille `size` (puissance de 2) avec les équipes puis des byes,
 * sans jamais former une paire (null, null) : chaque paire a au moins une équipe réelle.
 */
export function buildBracketSlots(teamIds: string[], size: number): (string | null)[] {
  const N = teamIds.length;
  const byes = size - N;
  const slots: (string | null)[] = Array(size).fill(null);
  let idx = 0;
  const fullPairs = (N - byes) / 2;
  for (let p = 0; p < fullPairs; p++) {
    slots[2 * p] = teamIds[idx++];
    slots[2 * p + 1] = teamIds[idx++];
  }
  for (let p = 0; p < byes; p++) {
    slots[2 * (fullPairs + p)] = teamIds[idx++];
    slots[2 * (fullPairs + p) + 1] = null;
  }
  return slots;
}

@Injectable()
export class CupBracketService {
  private readonly logger = new Logger(CupBracketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getOrCreatePlaceholderClub(tx: Prisma.TransactionClient): Promise<string> {
    const existing = await tx.club.findFirst({
      where: { name: BRACKET_PLACEHOLDER_CLUB_NAME },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await tx.club.create({
      data: {
        name: BRACKET_PLACEHOLDER_CLUB_NAME,
        validation_status: 'APPROVED',
        description: 'Club technique (brackets coupe) — ne pas utiliser comme club joueur.',
      },
      select: { id: true },
    });
    this.logger.log(`Club placeholder bracket créé : ${created.id}`);
    return created.id;
  }

  /**
   * Génère un arbre d’élimination directe (byes si N n’est pas une puissance de 2).
   */
  async generateSingleEliminationBracket(competitionId: string, teamIds: string[]): Promise<{
    message: string;
    matchCount: number;
    /** Présent dès qu’un slot TBD est utilisé (tous les brackets sauf finale à 2 équipes). */
    placeholderTeamId?: string;
  }> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: { teams: true },
    });

    if (!competition) {
      throw new BadRequestException('Compétition introuvable.');
    }
    if (competition.type !== 'CUP') {
      throw new BadRequestException('La génération bracket est réservée aux compétitions de type COUPE (CUP).');
    }

    const registered = new Set(competition.teams.map((t) => t.team_id));
    const unique = [...new Set(teamIds)];
    for (const id of unique) {
      if (!registered.has(id)) {
        throw new BadRequestException(`L’équipe ${id} n’est pas inscrite à cette compétition.`);
      }
    }

    if (unique.length < 2) {
      throw new BadRequestException('Au moins 2 équipes sont requises pour un bracket.');
    }

    const existingMatches = await this.prisma.match.count({ where: { competition_id: competitionId } });
    if (existingMatches > 0) {
      throw new BadRequestException(
        'Des matchs existent déjà pour cette compétition. Supprimez-les avant de générer un bracket.',
      );
    }

    const size = nextPow2(unique.length);
    const slots = buildBracketSlots(unique, size);
    const totalRounds = Math.log2(size) | 0;

    const result = await this.prisma.$transaction(async (tx) => {
      if (totalRounds === 1) {
        const a = slots[0];
        const b = slots[1];
        if (!a || !b) {
          throw new BadRequestException('Erreur de placement pour la finale à 2 équipes.');
        }
        await tx.match.create({
          data: {
            competition_id: competitionId,
            home_team_id: a,
            away_team_id: b,
            round: 'Finale',
            bracket_round: 0,
            bracket_index: 0,
            status: 'SCHEDULED',
          },
        });
        await tx.competition.update({
          where: { id: competitionId },
          data: { status: 'ONGOING' },
        });
        return {
          message: 'Bracket généré : 1 match (finale).',
          matchCount: 1,
        };
      }

      const tbdId = await this.getOrCreatePlaceholderClub(tx);

      // matchIds[r][i] : tours 1..finale (tour 0 = premier tour généré à part)
      const matchIds: string[][] = [];
      for (let r = 0; r < totalRounds; r++) {
        matchIds.push([]);
      }

      for (let r = 1; r < totalRounds; r++) {
        const count = size / 2 ** (r + 1);
        for (let i = 0; i < count; i++) {
          const m = await tx.match.create({
            data: {
              competition_id: competitionId,
              home_team_id: tbdId,
              away_team_id: tbdId,
              round: roundLabelForBracket(r, totalRounds),
              bracket_round: r,
              bracket_index: i,
              status: 'SCHEDULED',
            },
            select: { id: true },
          });
          matchIds[r].push(m.id);
        }
      }

      for (let r = 1; r < totalRounds - 1; r++) {
        for (let i = 0; i < matchIds[r].length; i++) {
          const nextId = matchIds[r + 1][Math.floor(i / 2)];
          const slot: BracketAdvanceSlot = i % 2 === 0 ? 'HOME' : 'AWAY';
          await tx.match.update({
            where: { id: matchIds[r][i] },
            data: {
              winner_advances_to_match_id: nextId,
              winner_slot_in_next: slot,
            },
          });
        }
      }

      const firstRoundLabel = roundLabelForBracket(0, totalRounds);

      for (let j = 0; j < size / 2; j++) {
        const a = slots[2 * j];
        const b = slots[2 * j + 1];
        const nextId = matchIds[1][Math.floor(j / 2)];
        const slotInNext: BracketAdvanceSlot = j % 2 === 0 ? 'HOME' : 'AWAY';

        if (a && b) {
          const m = await tx.match.create({
            data: {
              competition_id: competitionId,
              home_team_id: a,
              away_team_id: b,
              round: firstRoundLabel,
              bracket_round: 0,
              bracket_index: j,
              status: 'SCHEDULED',
              winner_advances_to_match_id: nextId,
              winner_slot_in_next: slotInNext,
            },
            select: { id: true },
          });
          matchIds[0].push(m.id);
        } else if (a || b) {
          const team = (a || b) as string;
          await tx.match.update({
            where: { id: nextId },
            data:
              slotInNext === 'HOME'
                ? { homeTeam: { connect: { id: team } } }
                : { awayTeam: { connect: { id: team } } },
          });
        } else {
          throw new BadRequestException(
            'Erreur interne de placement des byes (paire vide).',
          );
        }
      }

      await tx.competition.update({
        where: { id: competitionId },
        data: { status: 'ONGOING' },
      });

      const r0count = matchIds[0].length;
      const rest = matchIds.slice(1).reduce((acc, row) => acc + row.length, 0);
      const total = r0count + rest;

      return {
        message: `Bracket généré : ${total} matchs (élimination directe, ${size - unique.length} bye(s)).`,
        matchCount: total,
        placeholderTeamId: tbdId,
      };
    });

    const comp = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { name: true },
    });
    await this.notifications.notifyUsersInTeams(
      unique,
      '🏆 Tableau généré',
      `La phase finale « ${comp?.name ?? 'Coupe'} » est prête (${result.matchCount} matchs).`,
      'info',
      {
        category: 'MATCH',
        type: 'CUP_BRACKET_GENERATED',
        competition_id: competitionId,
      },
      { notificationType: 'MATCH', link: '/dashboard/matches' },
    );

    return result;
  }

  /**
   * Score d’ordre du libellé de tour : plus c’est bas, plus le tour est tôt (entrée du bracket).
   * Utilisé pour déduire bracket_round à partir du champ `round` existant.
   */
  static scoreRoundLabel(label: string | null | undefined): number {
    if (!label?.trim()) return 1000;
    const s = label
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .trim()
      .toLowerCase();
    if (/\b(seizi|16|seize)\b/.test(s) || /huiti|huit\b|8e\b|eighth|octav/.test(s)) return 0;
    if (/\bquart|quarter|4e\b/.test(s)) return 10;
    if (/\bdemi|semi|half\b/.test(s)) return 20;
    if (/\bfinale|\bfinal\b/.test(s) && !/demi/.test(s)) return 30;
    const tour = s.match(/tour\s*(\d+)/i);
    if (tour) return 40 + parseInt(tour[1], 10);
    return 500;
  }

  /**
   * Renseigne bracket_round et bracket_index (position dans le tour) à partir des libellés `round`
   * pour les matchs d’une coupe déjà créés sans positions bracket.
   */
  async repairBracketPositions(competitionId: string): Promise<{
    message: string;
    updated: number;
  }> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, type: true, name: true },
    });

    if (!competition) {
      throw new BadRequestException('Compétition introuvable.');
    }
    if (competition.type !== 'CUP') {
      throw new BadRequestException(
        'La réparation des positions bracket ne s’applique qu’aux compétitions de type COUPE (CUP).',
      );
    }

    const matches = await this.prisma.match.findMany({
      where: { competition_id: competitionId },
      select: {
        id: true,
        round: true,
        bracket_round: true,
        bracket_index: true,
      },
      orderBy: [{ id: 'asc' }],
    });

    if (matches.length === 0) {
      return {
        message: 'Aucun match à traiter pour cette compétition.',
        updated: 0,
      };
    }

    const byScore = new Map<number, typeof matches>();
    for (const m of matches) {
      const sc = CupBracketService.scoreRoundLabel(m.round);
      if (!byScore.has(sc)) byScore.set(sc, []);
      byScore.get(sc)!.push(m);
    }

    const sortedScores = [...byScore.keys()].sort((a, b) => a - b);
    const scoreToBracketRound = new Map<number, number>();
    sortedScores.forEach((sc, idx) => scoreToBracketRound.set(sc, idx));

    let updated = 0;

    for (const sc of sortedScores) {
      const group = byScore.get(sc)!;
      const sortedGroup = group.slice().sort((a, b) => a.id.localeCompare(b.id));
      const bracket_round = scoreToBracketRound.get(sc)!;

      sortedGroup.forEach((m, bracket_index) => {
        const needUpdate =
          m.bracket_round !== bracket_round || m.bracket_index !== bracket_index;
        if (needUpdate) {
          updated++;
        }
      });
    }

    await this.prisma.$transaction(
      sortedScores.flatMap((sc) => {
        const group = byScore.get(sc)!;
        const sortedGroup = group.slice().sort((a, b) => a.id.localeCompare(b.id));
        const bracket_round = scoreToBracketRound.get(sc)!;
        return sortedGroup.map((m, bracket_index) =>
          this.prisma.match.update({
            where: { id: m.id },
            data: { bracket_round, bracket_index },
          }),
        );
      }),
    );

    this.logger.log(
      `repairBracketPositions(${competition.name}): ${updated} match(s) mis à jour sur ${matches.length}.`,
    );

    return {
      message: `Positions bracket mises à jour : ${updated} match(s) sur ${matches.length}.`,
      updated,
    };
  }

  /** Libellé du 1er tour d’élimination en fonction du nombre d’équipes encore en lice. */
  knockoutRoundLabelFromQualifiedCount(qualifiedTeams: number): string {
    if (qualifiedTeams >= 32) return 'Seizièmes de Finale';
    if (qualifiedTeams >= 16) return 'Huitièmes de Finale';
    if (qualifiedTeams >= 8) return 'Quarts de finale';
    if (qualifiedTeams >= 4) return 'Demi-finales';
    return 'Finale';
  }

  /**
   * Prévisualise les affiches 1er vs 2e (croisement UEFA) avant génération de la phase finale.
   */
  async previewPromoteFromGroupsToBracket(competitionId: string): Promise<{
    canPromote: boolean;
    reason?: string;
    firstRoundName?: string;
    pairings: {
      label: string;
      home: { id: string; name: string };
      away: { id: string; name: string };
    }[];
    groupsSummary?: { letter: string; first: string; second: string }[];
  }> {
    const plan = await this.buildGroupsToKnockoutPlan(competitionId);
    if (!plan.ok) {
      return { canPromote: false, reason: plan.reason, pairings: [] };
    }
    return {
      canPromote: true,
      firstRoundName: plan.firstRoundName,
      pairings: plan.pairings.map((p) => ({
        label: p.label,
        home: p.home,
        away: p.away,
      })),
      groupsSummary: plan.groups.map((g) => ({
        letter: g.letter,
        first: g.first.name,
        second: g.second.name,
      })),
    };
  }

  /**
   * Crée le premier tour d’élimination (croisements 1er vs 2e) et l’arbre complet (TBD) jusqu’à la finale.
   */
  async promoteFromGroupsToBracket(competitionId: string): Promise<{
    message: string;
    matchCount: number;
  }> {
    const plan = await this.buildGroupsToKnockoutPlan(competitionId);
    if (!plan.ok) {
      throw new BadRequestException(plan.reason);
    }

    const pairings = plan.pairings.map((p) => ({
      homeId: p.home.id,
      awayId: p.away.id,
    }));

    const total = await this.prisma.$transaction(async (tx) => {
      const n = await this.persistKnockoutTreeFromGroupPairings(
        tx,
        competitionId,
        pairings,
        plan.firstRoundName,
      );
      return n;
    });

    this.logger.log(`promoteFromGroupsToBracket(${competitionId}): ${total} matchs créés.`);

    return {
      message: `Phase finale générée : ${total} matchs (${plan.firstRoundName} et suites).`,
      matchCount: total,
    };
  }

  private async buildGroupsToKnockoutPlan(competitionId: string): Promise<
    | { ok: false; reason: string }
    | {
        ok: true;
        firstRoundName: string;
        groups: {
          letter: string;
          first: StandingTeam;
          second: StandingTeam;
        }[];
        pairings: {
          label: string;
          home: StandingTeam;
          away: StandingTeam;
        }[];
      }
  > {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true, type: true, cup_scenario: true },
    });

    if (!competition) {
      return { ok: false, reason: 'Compétition introuvable.' };
    }

    const eligible =
      competition.type === 'CHAMPIONS' ||
      (competition.type === 'CUP' && competition.cup_scenario === 'GROUPS_AND_KNOCKOUT');
    if (!eligible) {
      return {
        ok: false,
        reason:
          'Réservé aux compétitions Champions ou aux coupes au scénario « Groupes + élimination ».',
      };
    }

    const matches = await this.prisma.match.findMany({
      where: { competition_id: competitionId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: [{ round: 'asc' }, { id: 'asc' }],
    });

    if (matches.some((m) => m.bracket_round != null)) {
      return { ok: false, reason: 'La phase finale est déjà générée (matchs bracket présents).' };
    }

    const groupMatches = matches.filter((m) => isGroupPhaseRound(m.round));
    if (groupMatches.length === 0) {
      return {
        ok: false,
        reason: 'Aucun match de phase de groupes (libellé « Groupe X »).',
      };
    }

    const notPlayed = groupMatches.filter((m) => m.status !== 'PLAYED');
    if (notPlayed.length > 0) {
      return {
        ok: false,
        reason: `Tous les matchs de groupes doivent être terminés (${notPlayed.length} encore non joués).`,
      };
    }

    const groupNames = [...new Set(groupMatches.map((m) => m.round!))].sort((a, b) =>
      parseGroupLetter(a).localeCompare(parseGroupLetter(b)),
    );

    const groups: {
      letter: string;
      first: StandingTeam;
      second: StandingTeam;
    }[] = [];

    for (const gn of groupNames) {
      const gms = groupMatches.filter((m) => m.round === gn);
      const teamMap = new Map<string, StandingTeam>();
      for (const m of gms) {
        teamMap.set(m.home_team_id, { id: m.homeTeam.id, name: m.homeTeam.name });
        teamMap.set(m.away_team_id, { id: m.awayTeam.id, name: m.awayTeam.name });
      }
      const teams = Array.from(teamMap.values());
      const played = gms
        .filter((m) => m.status === 'PLAYED')
        .map((m) => ({
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_score: m.home_score,
          away_score: m.away_score,
        }));
      const standings = computeGroupStandings(teams, played);
      if (standings.length < 2) {
        return { ok: false, reason: `Classement incomplet pour ${gn}.` };
      }
      const letter = parseGroupLetter(gn) || gn.replace(/^Groupe\s+/i, '').trim();
      groups.push({
        letter,
        first: standings[0].team,
        second: standings[1].team,
      });
    }

    const G = groups.length;
    const qualified = 2 * G;
    if (!isPowerOfTwo(qualified)) {
      return {
        ok: false,
        reason: `Nombre de qualifiés (${qualified}) : un tableau complet requiert 4, 8 ou 16 équipes (nombre de groupes : puissance de 2).`,
      };
    }

    const rawPairings = buildCrossGroupPairings(groups);
    const firstRoundName = this.knockoutRoundLabelFromQualifiedCount(qualified);

    return {
      ok: true,
      firstRoundName,
      groups,
      pairings: rawPairings.map((p) => ({
        label: p.label,
        home: p.home,
        away: p.away,
      })),
    };
  }

  /** Crée l’arbre (coquilles TBD + 1er tour réel). Retourne le nombre total de matchs créés. */
  private async persistKnockoutTreeFromGroupPairings(
    tx: Prisma.TransactionClient,
    competitionId: string,
    pairings: { homeId: string; awayId: string }[],
    firstRoundLabel: string,
  ): Promise<number> {
    const G = pairings.length;
    const size = 2 * G;
    const totalRounds = Math.log2(size) | 0;

    if (totalRounds === 1) {
      await tx.match.create({
        data: {
          competition_id: competitionId,
          home_team_id: pairings[0].homeId,
          away_team_id: pairings[0].awayId,
          round: 'Finale',
          bracket_round: 0,
          bracket_index: 0,
          status: 'SCHEDULED',
        },
      });
      return 1;
    }

    const tbdId = await this.getOrCreatePlaceholderClub(tx);
    const matchIds: string[][] = [];
    for (let r = 0; r < totalRounds; r++) {
      matchIds.push([]);
    }

    for (let r = 1; r < totalRounds; r++) {
      const count = size / 2 ** (r + 1);
      for (let i = 0; i < count; i++) {
        const m = await tx.match.create({
          data: {
            competition_id: competitionId,
            home_team_id: tbdId,
            away_team_id: tbdId,
            round: roundLabelForBracket(r, totalRounds),
            bracket_round: r,
            bracket_index: i,
            status: 'SCHEDULED',
          },
          select: { id: true },
        });
        matchIds[r].push(m.id);
      }
    }

    for (let r = 1; r < totalRounds - 1; r++) {
      for (let i = 0; i < matchIds[r].length; i++) {
        const nextId = matchIds[r + 1][Math.floor(i / 2)];
        const slot: BracketAdvanceSlot = i % 2 === 0 ? 'HOME' : 'AWAY';
        await tx.match.update({
          where: { id: matchIds[r][i] },
          data: {
            winner_advances_to_match_id: nextId,
            winner_slot_in_next: slot,
          },
        });
      }
    }

    for (let j = 0; j < G; j++) {
      const nextId = matchIds[1][Math.floor(j / 2)];
      const slotInNext: BracketAdvanceSlot = j % 2 === 0 ? 'HOME' : 'AWAY';
      await tx.match.create({
        data: {
          competition_id: competitionId,
          home_team_id: pairings[j].homeId,
          away_team_id: pairings[j].awayId,
          round: firstRoundLabel,
          bracket_round: 0,
          bracket_index: j,
          status: 'SCHEDULED',
          winner_advances_to_match_id: nextId,
          winner_slot_in_next: slotInNext,
        },
      });
    }

    const upper = matchIds.slice(1).reduce((acc, row) => acc + row.length, 0);
    return G + upper;
  }

  /**
   * Après un score admin, propage le vainqueur vers le match suivant (coupe / Champions KO).
   */
  async promoteWinnerIfBracket(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { competition: { select: { type: true } } },
    });

    const t = match?.competition?.type;
    if (!match?.competition_id || (t !== 'CUP' && t !== 'CHAMPIONS')) return;
    if (match.status !== 'PLAYED') return;
    if (!match.winner_advances_to_match_id || !match.winner_slot_in_next) return;

    const hs = match.home_score ?? 0;
    const as = match.away_score ?? 0;
    if (hs === as) return;

    const winnerId = hs > as ? match.home_team_id : match.away_team_id;

    await this.prisma.match.update({
      where: { id: match.winner_advances_to_match_id },
      data:
        match.winner_slot_in_next === 'HOME'
          ? { homeTeam: { connect: { id: winnerId } } }
          : { awayTeam: { connect: { id: winnerId } } },
    });
  }
}
