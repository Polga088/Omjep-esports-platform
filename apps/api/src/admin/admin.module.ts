import { Module } from '@nestjs/common';
import { AdminCompetitionsController } from './admin-competitions.controller';
import { AdminMatchesController } from './admin-matches.controller';
import { AdminSyncController } from './admin-sync.controller';
import { AdminClubsController } from './admin-clubs.controller';
import { AdminStoreController } from './admin-store.controller';
import { AdminStoreService } from './admin-store.service';
import { SyncModule } from '../sync/sync.module';
import { ClubsModule } from '../clubs/clubs.module';
import { PredictionsModule } from '../predictions/predictions.module';

@Module({
  imports: [SyncModule, ClubsModule, PredictionsModule],
  controllers: [
    AdminCompetitionsController,
    AdminMatchesController,
    AdminSyncController,
    AdminClubsController,
    AdminStoreController,
  ],
  providers: [AdminStoreService],
})
export class AdminModule {}
