import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

/** Statistiques publiques de la plateforme — pas d'authentification requise */
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('public')
  getPublicStats() {
    return this.statsService.getPublicStats();
  }
}
