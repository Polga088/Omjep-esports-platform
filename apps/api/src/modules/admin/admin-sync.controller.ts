import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProClubsService } from '../sync/proclubs.service';
import { MatchSyncService } from '../sync/match-sync.service';

@Controller('admin/sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSyncController {
  constructor(
    private readonly proClubsService: ProClubsService,
    private readonly matchSyncService: MatchSyncService,
  ) {}

  @Get('ea-match-syncs')
  async listEaMatchSyncs() {
    return this.matchSyncService.listProblematicForAdmin();
  }

  @Post('ea-match-syncs/:matchId/retry')
  async retryEaMatchSync(
    @Request() req: { user: { id: string } },
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ) {
    return this.matchSyncService.syncMatch(matchId, req.user.id);
  }

  @Post(':matchId')
  async syncMatch(@Param('matchId', ParseUUIDPipe) matchId: string) {
    try {
      const result = await this.proClubsService.syncMatch(matchId);

      if (!result.synced) {
        return {
          message: `Synchronisation impossible : ${result.reason}`,
          synced: false,
        };
      }

      return {
        message: 'Match synchronisé avec succès via ProClubs.',
        synced: true,
        match: result.updatedMatch,
        matchedPlayers: result.matchedPlayers,
        eventsCreated: result.createdEventsCount,
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Post('url/scrape')
  async syncFromUrl(@Body('url') url: string) {
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException(
        'Une URL ProClubs.io valide est requise (ex: https://proclubs.io/club/...).',
      );
    }

    try {
      const result = await this.proClubsService.syncFromProClubsUrl(url);

      if (!result.synced) {
        return {
          message: `Synchronisation impossible : ${result.reason}`,
          synced: false,
          scraped: result.scraped,
        };
      }

      return {
        message: 'Données ProClubs récupérées et matchées avec succès.',
        synced: true,
        scraped: result.scraped,
        matchedPlayers: result.matchedPlayers,
      };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
