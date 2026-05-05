import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import {
  TopPlayerRow,
  TopStatsResponse,
  HallOfFameEntry,
  CompetitionLeaderboardRow,
} from './types/competition-stats.types';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  /** Doit rester avant les routes `:id/*` pour ne pas interpréter "hall-of-fame" comme un UUID. */
  @Get('hall-of-fame')
  getHallOfFame(): Promise<HallOfFameEntry[]> {
    return this.competitionsService.getHallOfFame();
  }

  /**
   * Liste des compétitions (sélecteur hub « classement compétition »).
   * — `GET /competitions` et `GET /competitions/hub` : même payload (chemin explicite pour éviter tout conflit de routage).
   */
  @Get()
  listCompetitionsHubRoot() {
    return this.competitionsService.listCompetitionsHub();
  }

  @Get('hub')
  listCompetitionsHub() {
    return this.competitionsService.listCompetitionsHub();
  }

  @Get(':id/standings')
  getStandings(@Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.getStandings(id);
  }

  @Get(':id/top-stats')
  getTopStats(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TopStatsResponse> {
    return this.competitionsService.getTopStats(id);
  }

  @Get(':id/top-players')
  getTopPlayers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TopPlayerRow[]> {
    return this.competitionsService.getTopPlayers(id);
  }

  @Get(':id/leaderboard')
  getLeaderboard(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompetitionLeaderboardRow[]> {
    return this.competitionsService.getLeaderboard(id);
  }
}
