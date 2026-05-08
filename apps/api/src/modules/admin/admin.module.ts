import { Module } from '@nestjs/common';
import { AdminCompetitionsController } from './admin-competitions.controller';
import { AdminMatchesController } from './admin-matches.controller';
import { AdminSyncController } from './admin-sync.controller';
import { AdminClubsController } from './admin-clubs.controller';
import { AdminStoreController } from './admin-store.controller';
import { AdminStoreService } from './admin-store.service';
import { AdminCompetitionsService } from './admin-competitions.service';
import { DrawService } from './draw.service';
import { SyncModule } from '../sync/sync.module';
import { ClubsModule } from '../clubs/clubs.module';
import { PredictionsModule } from '../predictions/predictions.module';
import { RewardsModule } from '../rewards/rewards.module';
import { PlayerStatsModule } from '../player-stats/player-stats.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AdminWalletsController } from './admin-wallets.controller';
import { AdminNewsMediaController } from './admin-news-media.controller';
import { UsersModule } from '../users/users.module';
import { AdminUsersController } from './admin-users.controller';
import { CupBracketService } from './cup-bracket.service';
import { AdminEmailTemplatesController } from './admin-email-templates.controller';
import { AdminEmailTemplatesService } from './admin-email-templates.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    SyncModule,
    ClubsModule,
    PredictionsModule,
    RewardsModule,
    PlayerStatsModule,
    WalletsModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [
    AdminCompetitionsController,
    AdminMatchesController,
    AdminSyncController,
    AdminClubsController,
    AdminStoreController,
    AdminWalletsController,
    AdminUsersController,
    AdminNewsMediaController,
    AdminEmailTemplatesController,
  ],
  providers: [
    AdminStoreService,
    AdminCompetitionsService,
    DrawService,
    CupBracketService,
    AdminEmailTemplatesService,
  ],
})
export class AdminModule {}
