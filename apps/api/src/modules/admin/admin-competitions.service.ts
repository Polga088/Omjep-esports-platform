import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { DrawDto } from './dto/draw-competition.dto';
import { ValidatePotsDto } from './dto/validate-pots.dto';
import { GenerateLeagueCalendarDto } from './dto/generate-league-calendar.dto';
import { DrawService } from './draw.service';
import { assignLeagueKickoffs } from './league-schedule.util';
import { NotificationsService } from '../notifications/notifications.service';

type MatchRow = {
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  round: string;
  startTime?: Date;
};

@Injectable()
export class AdminCompetitionsService {
  private readonly logger = new Logger(AdminCompetitionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly drawService: DrawService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll() {
    const rows = await this.prisma.competition.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        teams: { include: { team: true } },
        _count: { select: { matches: true } },
      },
    });
    return rows.map((c) => ({
      ...c,
      isTransferMarketOpen: c.isTransferMarketOpen === true,
    }));
  }

  async updateTransferMarketOpen(id: string, isTransferMarketOpen: boolean) {
    const existing = await this.prisma.competition.findUnique({ where: { id } });
    if (!existing) {
      throw new BadRequestException('Compétition introuvable.');
    }
    const competition = await this.prisma.competition.update({
      where: { id },
      data: { isTransferMarketOpen },
      include: {
        teams: { include: { team: true } },
        _count: { select: { matches: true } },
      },
    });
    return {
      message: isTransferMarketOpen
        ? 'Marché des transferts ouvert pour cette compétition.'
        : 'Marché des transferts fermé pour cette compétition.',
      competition: {
        ...competition,
        isTransferMarketOpen: competition.isTransferMarketOpen === true,
      },
    };
  }

  /**
   * Supprime une compétition. Les matchs, événements, pronostics liés sont
   * supprimés en cascade (FK matches → competitions ON DELETE CASCADE).
   */
  async deleteCompetition(id: string) {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new BadRequestException('Compétition introuvable.');
    }

    this.logger.log(
      `Suppression de la compétition "${competition.name}" (${id}) et de tous ses records liés (Cascade)`,
    );

    await this.prisma.competition.delete({ where: { id } });

    return {
      message: 'Compétition supprimée.',
      deletedId: id,
      name: competition.name,
    };
  }

  /**
   * Nettoyage maintenance : supprime les matchs dont competition_id ne référence
   * plus aucune ligne dans competitions (données incohérentes / anciennes migrations).
   */
  async cleanupOrphanMatches(): Promise<{ deletedCount: number }> {
    const result = await this.prisma.$executeRaw`
      DELETE FROM "matches"
      WHERE "competition_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "competitions" c WHERE c."id" = "matches"."competition_id"
        )
    `;

    const deletedCount = typeof result === 'bigint' ? Number(result) : Number(result);
    this.logger.log(
      `Nettoyage matchs orphelins : ${deletedCount} ligne(s) supprimée(s).`,
    );

    return { deletedCount };
  }

  /**
   * Validation des chapeaux UCL (intégrité + format) — utilisée par l’admin avant validation du tirage.
   */
  async validatePots(competitionId: string, dto: ValidatePotsDto) {
    return this.drawService.validatePotsIntegrity(competitionId, dto.pots);
  }

  async createCompetition(dto: CreateCompetitionDto) {
    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    if (endDate <= startDate) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début.');
    }

    const competition = await this.prisma.competition.create({
      data: {
        name: dto.name,
        type: dto.type,
        start_date: startDate,
        end_date: endDate,
        cup_scenario:
          dto.type === 'CUP' ? dto.cup_scenario ?? 'SINGLE_ELIMINATION' : undefined,
        teams: dto.team_ids
          ? { create: dto.team_ids.map((team_id) => ({ team_id })) }
          : undefined,
      },
      include: { teams: { include: { team: true } } },
    });

    return { message: 'Compétition créée avec succès.', competition };
  }

  async generateCalendar(id: string, dto: GenerateLeagueCalendarDto = {}) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: { teams: true },
    });

    if (!competition) throw new BadRequestException('Compétition introuvable.');

    if (dto.league_schedule && competition.type !== 'LEAGUE') {
      throw new BadRequestException(
        'league_schedule ne s’applique qu’aux compétitions de type LEAGUE (championnat).',
      );
    }

    const teamIds = competition.teams.map((ct) => ct.team_id);

    const existingCount = await this.prisma.match.count({ where: { competition_id: id } });
    if (existingCount > 0) {
      throw new BadRequestException(
        'Un calendrier a déjà été généré pour cette compétition. Supprimez les matchs existants avant de régénérer.',
      );
    }

    let matches: MatchRow[];
    let message: string;

    if (competition.type === 'LEAGUE') {
      if (teamIds.length < 2) {
        throw new BadRequestException('Il faut au moins 2 équipes pour un championnat.');
      }
      matches = this.generateRoundRobin(teamIds, id);
      if (dto.league_schedule) {
        const ls = dto.league_schedule;
        const anchor = ls.anchor_date
          ? new Date(ls.anchor_date)
          : new Date(competition.start_date);
        try {
          matches = assignLeagueKickoffs(matches, {
            match_weekdays: ls.match_weekdays,
            matches_per_day: ls.matches_per_day ?? 2,
            slot_gap_minutes: ls.slot_gap_minutes ?? 120,
            anchor_date: anchor,
            first_kickoff_time: ls.first_kickoff_time ?? '20:00',
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Planification invalide.';
          throw new BadRequestException(msg);
        }
        message = `Championnat généré : ${matches.length} matchs créés avec dates planifiées (aller simple).`;
      } else {
        message = `Championnat généré : ${matches.length} matchs créés (aller simple).`;
      }
    } else if (competition.type === 'CUP') {
      if (teamIds.length < 2) {
        throw new BadRequestException('Il faut au moins 2 équipes pour une coupe.');
      }
      matches = this.generateBrackets(teamIds, id);
      message = `Bracket généré : ${matches.length} matchs du 1er tour créés.`;
    } else {
      if (teamIds.length < 8) {
        throw new BadRequestException(
          'Il faut au minimum 8 équipes pour un format Champions (groupes de 4).',
        );
      }
      matches = this.generateUCLGroups(teamIds, id);
      message = `Phase de groupes générée : ${matches.length} matchs créés (${Math.ceil(teamIds.length / 4)} groupe${Math.ceil(teamIds.length / 4) > 1 ? 's' : ''}).`;
    }

    const created = await this.prisma.match.createMany({
      data: matches.map((m) => ({
        competition_id: m.competition_id,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        round: m.round,
        startTime: m.startTime ?? undefined,
      })),
    });

    await this.prisma.competition.update({
      where: { id },
      data: { status: 'ONGOING' },
    });

    const label = competition.name ?? 'Compétition';
    await this.notifications.notifyUsersInTeams(
      teamIds,
      '📅 Matchs créés',
      `De nouveaux matchs sont disponibles pour « ${label} » (${created.count} rencontres).`,
      'info',
      { category: 'MATCH', type: 'ADMIN_CALENDAR_OR_DRAW', competition_id: id },
      { notificationType: 'MATCH', link: '/dashboard/matches' },
    );

    return { message, matchCount: created.count };
  }

  async performDraw(id: string, dto: DrawDto) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: {
        teams: { include: { team: { select: { id: true, name: true } } } },
      },
    });

    if (!competition) throw new BadRequestException('Compétition introuvable.');

    if (competition.type === 'LEAGUE') {
      throw new BadRequestException(
        'Le format Championnat utilise "Générer le calendrier", pas le tirage au sort.',
      );
    }

    const existingCount = await this.prisma.match.count({ where: { competition_id: id } });
    if (existingCount > 0) {
      throw new BadRequestException(
        'Un tirage a déjà été effectué pour cette compétition. Supprimez les matchs avant de retirer.',
      );
    }

    const teamIds = competition.teams.map((ct) => ct.team_id);

    let matches: MatchRow[];
    let drawResult: Record<string, unknown>;

    if (competition.type === 'CUP') {
      let seeds: string[];

      if (dto.mode === 'manual') {
        if (!dto.seeds || dto.seeds.length === 0) {
          throw new BadRequestException('Le mode manuel requiert le tableau seeds[].');
        }
        const provided = new Set(dto.seeds);
        const all = new Set(teamIds);
        if (provided.size !== all.size || [...all].some((t) => !provided.has(t))) {
          throw new BadRequestException(
            'seeds[] doit contenir exactement les équipes inscrites à la compétition.',
          );
        }
        seeds = dto.seeds;
      } else {
        seeds = [...teamIds];
        for (let i = seeds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
        }
      }

      matches = this.buildSeededBracket(seeds, id);
      const pairs = matches.map((_m, i) => ({
        match: i + 1,
        home: seeds[i],
        away: seeds[seeds.length - 1 - i],
      }));
      drawResult = { seeds, pairs, round: this.getCupRoundName(seeds.length) };
    } else {
      let pots: string[][];
      const numGroups = Math.ceil(teamIds.length / 4);

      if (dto.mode === 'manual') {
        if (!dto.pots || dto.pots.length < 2) {
          throw new BadRequestException('Le mode manuel requiert au moins 2 chapeaux dans pots[].');
        }
        const integrity = await this.drawService.validatePotsIntegrity(id, dto.pots);
        if (!integrity.valid) {
          throw new BadRequestException(integrity.errors[0] ?? 'Chapeaux invalides.');
        }
        pots = dto.pots;
      } else {
        const shuffled = [...teamIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const potSize = Math.ceil(shuffled.length / 4);
        pots = [
          shuffled.slice(0, potSize),
          shuffled.slice(potSize, potSize * 2),
          shuffled.slice(potSize * 2, potSize * 3),
          shuffled.slice(potSize * 3),
        ];
      }

      const { matches: champMatches, groups } = this.buildUCLGroups(pots, id, numGroups);
      matches = champMatches;
      drawResult = {
        pots: pots.map((p, i) => ({ chapeau: i + 1, teams: p })),
        groups,
      };
    }

    const created = await this.prisma.match.createMany({ data: matches });
    await this.prisma.competition.update({
      where: { id },
      data: { status: 'ONGOING' },
    });

    const label = competition.name ?? 'Compétition';
    await this.notifications.notifyUsersInTeams(
      teamIds,
      '🎲 Tirage effectué',
      `Le tirage « ${label} » est connu : ${created.count} matchs créés.`,
      'info',
      { category: 'MATCH', type: 'ADMIN_DRAW_CREATED', competition_id: id },
      { notificationType: 'MATCH', link: '/dashboard/matches' },
    );

    return {
      message: `Tirage effectué — ${created.count} matchs créés.`,
      matchCount: created.count,
      draw: drawResult,
    };
  }

  private generateRoundRobin(teamIds: string[], competitionId: string): MatchRow[] {
    const teams = [...teamIds];
    if (teams.length % 2 !== 0) teams.push('BYE');

    const totalRounds = teams.length - 1;
    const matchesPerRound = teams.length / 2;
    const matches: MatchRow[] = [];

    for (let round = 0; round < totalRounds; round++) {
      for (let m = 0; m < matchesPerRound; m++) {
        const home = teams[m];
        const away = teams[teams.length - 1 - m];
        if (home === 'BYE' || away === 'BYE') continue;
        matches.push({
          competition_id: competitionId,
          home_team_id: home,
          away_team_id: away,
          round: `Journée ${round + 1}`,
        });
      }
      const last = teams.pop()!;
      teams.splice(1, 0, last);
    }

    return matches;
  }

  private generateBrackets(teamIds: string[], competitionId: string): MatchRow[] {
    const shuffled = [...teamIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const n = shuffled.length;
    const roundName = this.getCupRoundName(n);

    const matches: MatchRow[] = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      matches.push({
        competition_id: competitionId,
        home_team_id: shuffled[i],
        away_team_id: shuffled[i + 1],
        round: roundName,
      });
    }

    return matches;
  }

  private buildSeededBracket(seeds: string[], competitionId: string): MatchRow[] {
    const roundName = this.getCupRoundName(seeds.length);
    const matches: MatchRow[] = [];
    const teams = [...seeds];

    if (teams.length % 2 !== 0) teams.push('BYE');

    const half = Math.floor(teams.length / 2);
    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      if (home === 'BYE' || away === 'BYE') continue;
      matches.push({
        competition_id: competitionId,
        home_team_id: home,
        away_team_id: away,
        round: roundName,
      });
    }

    return matches;
  }

  private buildUCLGroups(
    pots: string[][],
    competitionId: string,
    numGroups: number,
  ): { matches: MatchRow[]; groups: { name: string; teams: string[] }[] } {
    const GROUP_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const groups: string[][] = Array.from({ length: numGroups }, () => []);

    const pot0 = pots[0].slice(0, numGroups);
    pot0.forEach((teamId, g) => groups[g].push(teamId));

    for (let p = 1; p < pots.length; p++) {
      const shuffled = [...pots[p]];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      for (let g = 0; g < numGroups && g < shuffled.length; g++) {
        groups[g].push(shuffled[g]);
      }
    }

    const matches: MatchRow[] = [];
    const groupMeta: { name: string; teams: string[] }[] = [];

    groups.forEach((groupTeams, gi) => {
      const groupName = `Groupe ${GROUP_LABELS[gi]}`;
      groupMeta.push({ name: groupName, teams: groupTeams });

      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matches.push({
            competition_id: competitionId,
            home_team_id: groupTeams[i],
            away_team_id: groupTeams[j],
            round: groupName,
          });
        }
      }
    });

    return { matches, groups: groupMeta };
  }

  private getCupRoundName(teamCount: number): string {
    if (teamCount >= 32) return 'Seizièmes de Finale';
    if (teamCount >= 16) return 'Huitièmes de Finale';
    if (teamCount >= 8) return 'Quarts de Finale';
    if (teamCount >= 4) return 'Demi-Finales';
    return 'Finale';
  }

  private generateUCLGroups(teamIds: string[], competitionId: string): MatchRow[] {
    const shuffled = [...teamIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const GROUP_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const GROUP_SIZE = 4;
    const matches: MatchRow[] = [];

    let groupIndex = 0;
    for (let start = 0; start < shuffled.length; start += GROUP_SIZE) {
      const groupTeams = shuffled.slice(start, start + GROUP_SIZE);
      const groupName = `Groupe ${GROUP_LABELS[groupIndex]}`;

      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matches.push({
            competition_id: competitionId,
            home_team_id: groupTeams[i],
            away_team_id: groupTeams[j],
            round: groupName,
          });
        }
      }
      groupIndex++;
    }

    return matches;
  }
}
