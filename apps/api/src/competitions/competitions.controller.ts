import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Get(':id/standings')
  getStandings(@Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.getStandings(id);
  }

  @Get(':id/top-stats')
  getTopStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.competitionsService.getTopStats(id);
  }
}
