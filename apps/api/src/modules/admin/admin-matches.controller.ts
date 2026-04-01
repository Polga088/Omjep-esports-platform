import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '@api/prisma/prisma.service';
import { PredictionsService } from '../predictions/predictions.service';
import { EventType } from '@omjep/shared';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { RescheduleMatchDto } from './dto/reschedule-match.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardsService } from '../rewards/rewards.service';
import { PlayerStatsService } from '../player-stats/player-stats.service';

interface ScoreEventDto {
  player_id: string;
  team_id?: string;
  type: EventType;
  minute?: number;
}

interface UpdateScoreDto {
  home_score: number;
  away_score: number;
  events?: ScoreEventDto[];
}

const MATCH_INCLUDE = {
  competition: { select: { id: true, name: true, type: true } },
  homeTeam: { select: { id: true, name: true, logo_url: true } },
  awayTeam: { select: { id: true, name: true, logo_url: true } },
  events: {
    include: {
      player: { select: { id: true, ea_persona_name: true } },
      team: { select: { id: true, name: true } },
    },
  },
} as const;

@Controller('admin/matches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminMatchesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionsService: PredictionsService,
    private readonly notificationsService: NotificationsService,
    private readonly rewardsService: RewardsService,
    private readonly playerStatsService: PlayerStatsService,
  ) {}

  @Get()
  async findAll(@Query('competition_id') competitionId?: string) {
    // Sans filtre explicite : uniquement les matchs rattachés à une compétition existante
    // (exclut competition_id null et lignes orphelines / incohérentes pour les compteurs admin).
    const where = competitionId
      ? { competition_id: competitionId }
      : { competition: { is: {} } };

    return this.prisma.match.findMany({
      where,
      orderBy: [{ status: 'asc' }, { round: 'asc' }],
      include: MATCH_INCLUDE,
    });
  }

  @Patch(':id/score')
  async updateScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateScoreDto,
  ) {
    const match = await this.prisma.match.findUnique({ where: { id } });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    if (match.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Seuls les matchs SCHEDULED peuvent recevoir un score.',
      );
    }

    if (body.home_score == null || body.away_score == null) {
      throw new BadRequestException('home_score et away_score sont requis.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.events?.length) {
        await tx.matchEvent.deleteMany({ where: { match_id: id } });

        await tx.matchEvent.createMany({
          data: body.events.map((e) => ({
            match_id: id,
            player_id: e.player_id,
            team_id: e.team_id ?? match.home_team_id,
            type: e.type,
            minute: e.minute ?? null,
          })),
        });
      }

      return tx.match.update({
        where: { id },
        data: {
          home_score: Number(body.home_score),
          away_score: Number(body.away_score),
          status: 'PLAYED',
          played_at: new Date(),
        },
        include: MATCH_INCLUDE,
      });
    });

    await this.predictionsService.resolvePredictions(id);
    const [rewards] = await Promise.all([
      this.rewardsService.distributeRewards(id),
      this.playerStatsService.updateFromMatch(id),
    ]);

    return { message: 'Résultat enregistré.', match: updated, rewards };
  }

  /**
   * Correction rétroactive d'un score pour un match déjà terminé (status PLAYED).
   *
   * Les standings sont calculés dynamiquement à partir des scores en base
   * (voir CompetitionsService.getStandings), donc corriger le score ici
   * suffit à propager l'impact sur le classement sans recalcul supplémentaire.
   *
   * Si le vainqueur change, les points V/N/D sont automatiquement ajustés
   * au prochain appel GET /competitions/:id/standings.
   */
  @Patch(':id/correct-score')
  async correctScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMatchScoreDto,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        home_score: true,
        away_score: true,
        home_team_id: true,
        away_team_id: true,
        competition_id: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    if (match.status !== 'PLAYED') {
      throw new BadRequestException(
        'Seuls les matchs terminés (PLAYED) peuvent faire l\'objet d\'une correction rétroactive.',
      );
    }

    const oldHome = match.home_score ?? 0;
    const oldAway = match.away_score ?? 0;
    const newHome = dto.home_score;
    const newAway = dto.away_score;

    // Détecter si le vainqueur change (pour le log métier)
    const oldWinner =
      oldHome > oldAway ? 'home' : oldAway > oldHome ? 'away' : 'draw';
    const newWinner =
      newHome > newAway ? 'home' : newAway > newHome ? 'away' : 'draw';
    const winnerChanged = oldWinner !== newWinner;

    const updated = await this.prisma.match.update({
      where: { id },
      data: {
        home_score: newHome,
        away_score: newAway,
      },
      include: MATCH_INCLUDE,
    });

    return {
      message: winnerChanged
        ? `Score corrigé (${oldHome}–${oldAway} → ${newHome}–${newAway}). Le vainqueur a changé — le classement est mis à jour automatiquement.`
        : `Score corrigé (${oldHome}–${oldAway} → ${newHome}–${newAway}). Le vainqueur reste identique.`,
      winnerChanged,
      match: updated,
    };
  }

  /**
   * Passe un match en litige (DISPUTED).
   * - Accepte les matchs PLAYED ou SCHEDULED.
   * - Si le match était PLAYED, les scores sont annulés → il sort automatiquement
   *   des calculs de standings (getStandings filtre sur status='PLAYED').
   * - Notifie les managers des deux clubs.
   */
  @Patch(':id/dispute')
  async disputeMatch(@Param('id', ParseUUIDPipe) id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        home_team_id: true,
        away_team_id: true,
        competition_id: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    const allowedStatuses = ['PLAYED', 'SCHEDULED'] as const;
    if (!allowedStatuses.includes(match.status as typeof allowedStatuses[number])) {
      throw new BadRequestException(
        `Un litige ne peut être déclaré que sur un match PLAYED ou SCHEDULED (statut actuel : ${match.status}).`,
      );
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data: {
        status: 'DISPUTED',
        // Si le match était PLAYED on annule les scores pour le sortir du classement
        home_score: null,
        away_score: null,
      },
      include: MATCH_INCLUDE,
    });

    const matchLabel = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    const notifTitle = '⚠️ Match en litige';
    const notifMsg = `Le match ${matchLabel} a été placé en litige par l'administration. Vous serez contacté pour la suite.`;
    const metadata = { match_id: id };

    await Promise.all([
      this.notificationsService.sendToTeamManagers(match.home_team_id, notifTitle, notifMsg, metadata),
      this.notificationsService.sendToTeamManagers(match.away_team_id, notifTitle, notifMsg, metadata),
    ]);

    return { message: `Match placé en litige. Les managers des deux clubs ont été notifiés.`, match: updated };
  }

  /**
   * Reprogramme un match DISPUTED (ou CANCELLED) → SCHEDULED.
   * - Remet les scores à null.
   * - Enregistre la nouvelle date dans scheduled_at.
   * - Notifie les managers des deux clubs.
   */
  @Patch(':id/reschedule')
  async rescheduleMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleMatchDto,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        home_team_id: true,
        away_team_id: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    if (match.status !== 'DISPUTED' && match.status !== 'CANCELLED') {
      throw new BadRequestException(
        `Seuls les matchs DISPUTED ou CANCELLED peuvent être reprogrammés (statut actuel : ${match.status}).`,
      );
    }

    const scheduledDate = new Date(dto.scheduled_at);

    const updated = await this.prisma.match.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        home_score: null,
        away_score: null,
        played_at: null,
        scheduled_at: scheduledDate,
      },
      include: MATCH_INCLUDE,
    });

    const matchLabel = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
    const dateStr = scheduledDate.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const notifTitle = '📅 Match reprogrammé';
    const notifMsg = `Le match ${matchLabel} a été reprogrammé au ${dateStr}.`;
    const metadata = { match_id: id, scheduled_at: dto.scheduled_at };

    await Promise.all([
      this.notificationsService.sendToTeamManagers(match.home_team_id, notifTitle, notifMsg, metadata),
      this.notificationsService.sendToTeamManagers(match.away_team_id, notifTitle, notifMsg, metadata),
    ]);

    return { message: `Match reprogrammé au ${dateStr}. Les managers ont été notifiés.`, match: updated };
  }
}
