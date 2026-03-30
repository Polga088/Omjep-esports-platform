import { Module } from '@nestjs/common';
import { AdminCompetitionsController } from './admin-competitions.controller';
import { AdminMatchesController } from './admin-matches.controller';
import { AdminSyncController } from './admin-sync.controller';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [SyncModule],
  controllers: [
    AdminCompetitionsController,
    AdminMatchesController,
    AdminSyncController,
  ],
})
export class AdminModule {}
