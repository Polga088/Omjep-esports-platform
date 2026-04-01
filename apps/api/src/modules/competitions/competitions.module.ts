import { Module } from '@nestjs/common';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { ModeratorLeagueController } from './moderator-league.controller';
import { ModeratorLeagueService } from './moderator-league.service';
import { TournamentAdvanceService } from './tournament-advance.service';
import { RewardsModule } from '../rewards/rewards.module';
import { PlayerStatsModule } from '../player-stats/player-stats.module';

@Module({
  imports: [RewardsModule, PlayerStatsModule],
  controllers: [CompetitionsController, ModeratorLeagueController],
  providers: [CompetitionsService, ModeratorLeagueService, TournamentAdvanceService],
  exports: [CompetitionsService, ModeratorLeagueService],
})
export class CompetitionsModule {}
