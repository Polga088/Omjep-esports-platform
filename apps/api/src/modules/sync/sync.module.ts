import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './sync.service';
import { ProClubsService } from './proclubs.service';
import { EaStatsService } from './ea-stats.service';
import { EaStatsController } from './ea-stats.controller';
import { LevelingModule } from '../leveling/leveling.module';
import { MatchSyncService } from './match-sync.service';
import { MatchSyncController } from './match-sync.controller';
import { EaClubsStubProvider } from './providers/ea-clubs.stub.provider';
import { EaClubsProviderFactory } from './providers/ea-clubs-provider.factory';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
    LevelingModule,
  ],
  controllers: [EaStatsController, MatchSyncController],
  providers: [
    SyncService,
    ProClubsService,
    EaStatsService,
    MatchSyncService,
    EaClubsStubProvider,
    EaClubsProviderFactory,
  ],
  exports: [
    SyncService,
    ProClubsService,
    EaStatsService,
    MatchSyncService,
    EaClubsProviderFactory,
  ],
})
export class SyncModule {}
