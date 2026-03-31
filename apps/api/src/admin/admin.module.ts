import { Module } from '@nestjs/common';
import { AdminCompetitionsController } from './admin-competitions.controller';
import { AdminMatchesController } from './admin-matches.controller';
import { AdminSyncController } from './admin-sync.controller';
import { AdminClubsController } from './admin-clubs.controller';
import { SyncModule } from '../sync/sync.module';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [SyncModule, ClubsModule],
  controllers: [
    AdminCompetitionsController,
    AdminMatchesController,
    AdminSyncController,
    AdminClubsController,
  ],
})
export class AdminModule {}
