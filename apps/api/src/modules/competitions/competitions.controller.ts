import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import {
  TopPlayerRow,
  TopStatsResponse,
  HallOfFameEntry,
} from './types/competition-stats.types';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  /** Doit rester avant les routes `:id/*` pour ne pas interpréter "hall-of-fame" comme un UUID. */
  @Get('hall-of-fame')
  getHallOfFame(): Promise<HallOfFameEntry[]> {
    return this.competitionsService.getHallOfFame();
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
}
