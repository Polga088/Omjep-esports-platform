import { Module } from '@nestjs/common';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { ModeratorLeagueController } from './moderator-league.controller';
import { ModeratorLeagueService } from './moderator-league.service';

@Module({
  controllers: [CompetitionsController, ModeratorLeagueController],
  providers: [CompetitionsService, ModeratorLeagueService],
  exports: [CompetitionsService, ModeratorLeagueService],
})
export class CompetitionsModule {}
