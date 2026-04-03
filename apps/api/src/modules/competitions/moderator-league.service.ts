import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { EventType } from '@omjep/shared';
import { CreateModeratorMatchDto } from './dto/create-moderator-match.dto';
import { ModeratorValidateScoreDto } from './dto/moderator-validate-score.dto';
import { RewardsService } from '../rewards/rewards.service';
import { PlayerStatsService } from '../player-stats/player-stats.service';
import { NotificationsService } from '../notifications/notifications.service';

const MATCH_INCLUDE = {
  competition: { select: { id: true, name: true, type: true } },
  homeTeam: { select: { id: true, name: true, logo_url: true } },
  awayTeam: { select: { id: true, name: true, logo_url: true } },
  scoreReports: {
    include: {
      reportingTeam: { select: { id: true, name: true } },
      submittedBy: {
        select: { id: true, email: true, ea_persona_name: true },
      },
    },
  },
  events: {
    include: {
      player: { select: { id: true, ea_persona_name: true } },
      team: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class ModeratorLeagueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardsService: RewardsService,
    private readonly playerStatsService: PlayerStatsService,
    private readonly notifications: NotificationsService,
  ) {}

  async listCompetitions() {
    return this.prisma.competition.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        teams: { include: { team: true } },
        _count: { select: { matches: true } },
      },
    });
  }

  async listMatches(competitionId?: string) {
    const where = competitionId ? { competition_id: competitionId } : {};

    return this.prisma.match.findMany({
      where,
      orderBy: [{ status: 'asc' }, { round: 'asc' }],
      include: MATCH_INCLUDE,
    });
  }

  async createMatch(competitionId: string, dto: CreateModeratorMatchDto) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: { teams: true },
    });

    if (!competition) {
      throw new NotFoundException('Compétition introuvable.');
    }

    const teamIds = new Set(competition.teams.map((t) => t.team_id));
    if (!teamIds.has(dto.home_team_id) || !teamIds.has(dto.away_team_id)) {
      throw new BadRequestException(
        'Les deux équipes doivent être inscrites dans cette compétition.',
      );
    }

    if (dto.home_team_id === dto.away_team_id) {
      throw new BadRequestException('Une équipe ne peut pas jouer contre elle-même.');
    }

    const match = await this.prisma.match.create({
      data: {
        competition_id: competitionId,
        home_team_id: dto.home_team_id,
        away_team_id: dto.away_team_id,
        round: dto.round ?? null,
        status: 'SCHEDULED',
        startTime: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      },
      include: MATCH_INCLUDE,
    });

    const label = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    await this.notifications.notifyUsersInTeams(
      [dto.home_team_id, dto.away_team_id],
      '📅 Nouveau match',
      `Un match a été programmé : ${label}.`,
      'info',
      {
        type: 'MATCH_CREATED',
        category: 'MATCH',
        match_id: match.id,
        competition_id: competitionId,
      },
      { notificationType: 'MATCH', link: '/dashboard/matches' },
    );

    return { message: 'Match créé.', match };
  }

  async generateCalendar(competitionId: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: { teams: true },
    });

    if (!competition) {
      throw new BadRequestException('Compétition introuvable.');
    }

    const teamIds = competition.teams.map((ct) => ct.team_id);

    if (teamIds.length < 2) {
      throw new BadRequestException(
        'Il faut au moins 2 équipes pour générer un calendrier.',
      );
    }

    const rows = this.buildRoundRobinMatches(teamIds, competitionId);
    const created = await this.prisma.match.createMany({ data: rows });

    await this.prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'ONGOING' },
    });

    const label = competition.name ?? 'Compétition';
    await this.notifications.notifyUsersInTeams(
      teamIds,
      '📅 Calendrier généré',
      `Le calendrier « ${label} » est disponible (${created.count} matchs).`,
      'info',
      { category: 'MATCH', type: 'LEAGUE_CALENDAR_GENERATED', competition_id: competitionId },
      { notificationType: 'MATCH', link: '/dashboard/matches' },
    );

    return {
      message: `Calendrier généré : ${created.count} matchs créés.`,
      matchCount: created.count,
    };
  }

  async validateScore(matchId: string, body: ModeratorValidateScoreDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        scoreReports: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    if (match.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Seuls les matchs programmés peuvent être validés par le commissaire.',
      );
    }

    const homeReport = match.scoreReports.find(
      (r) => r.reporting_team_id === match.home_team_id,
    );
    const awayReport = match.scoreReports.find(
      (r) => r.reporting_team_id === match.away_team_id,
    );

    if (!homeReport || !awayReport) {
      throw new BadRequestException(
        'Les deux clubs doivent avoir transmis une déclaration de score avant validation.',
      );
    }

    if (
      homeReport.home_score !== awayReport.home_score ||
      homeReport.away_score !== awayReport.away_score
    ) {
      throw new ConflictException(
        `Les déclarations divergent : club domicile ${homeReport.home_score}–${homeReport.away_score}, club extérieur ${awayReport.home_score}–${awayReport.away_score}.`,
      );
    }

    const homeScore = homeReport.home_score;
    const awayScore = homeReport.away_score;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.matchScoreReport.deleteMany({ where: { match_id: matchId } });

      if (body.events?.length) {
        await tx.matchEvent.deleteMany({ where: { match_id: matchId } });

        await tx.matchEvent.createMany({
          data: body.events.map((e) => ({
            match_id: matchId,
            player_id: e.player_id,
            team_id: e.team_id ?? match.home_team_id,
            type: e.type as EventType,
            minute: e.minute ?? null,
          })),
        });
      }

      return tx.match.update({
        where: { id: matchId },
        data: {
          home_score: homeScore,
          away_score: awayScore,
          status: 'PLAYED',
          played_at: new Date(),
        },
        include: MATCH_INCLUDE,
      });
    });

    const rewards = await this.rewardsService.distributeRewards(matchId);
    await this.playerStatsService.updateFromMatch(matchId);

    return {
      message: 'Score validé : les deux clubs avaient déclaré le même résultat.',
      match: updated,
      rewards,
    };
  }

  private buildRoundRobinMatches(teamIds: string[], competitionId: string) {
    const teams = [...teamIds];
    if (teams.length % 2 !== 0) {
      teams.push('BYE');
    }

    const totalRounds = teams.length - 1;
    const matchesPerRound = teams.length / 2;
    const matches: {
      competition_id: string;
      home_team_id: string;
      away_team_id: string;
      round: string;
    }[] = [];

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
}
