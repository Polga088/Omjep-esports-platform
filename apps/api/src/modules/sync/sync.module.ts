import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './sync.service';
import { ProClubsService } from './proclubs.service';
import { EaStatsService } from './ea-stats.service';
import { EaStatsController } from './ea-stats.controller';
import { LevelingModule } from '../leveling/leveling.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
    LevelingModule,
  ],
  controllers: [EaStatsController],
  providers: [SyncService, ProClubsService, EaStatsService],
  exports: [SyncService, ProClubsService, EaStatsService],
})
export class SyncModule {}
