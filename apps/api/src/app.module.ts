import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import {
  AdminModule,
  AuthModule,
  ChatModule,
  ClubsModule,
  CompetitionsModule,
  FinanceModule,
  GamificationModule,
  InvitationsModule,
  LevelingModule,
  MatchesModule,
  NewsModule,
  NotificationsModule,
  PredictionsModule,
  StatsModule,
  StoreModule,
  SubscriptionsModule,
  SyncModule,
  TeamsModule,
  TransfersModule,
  UsersModule,
  WalletsModule,
} from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    MatchesModule,
    CompetitionsModule,
    InvitationsModule,
    SyncModule,
    AdminModule,
    FinanceModule,
    NotificationsModule,
    TransfersModule,
    LevelingModule,
    GamificationModule,
    ClubsModule,
    StoreModule,
    PredictionsModule,
    SubscriptionsModule,
    NewsModule,
    StatsModule,
    ChatModule,
    WalletsModule,
  ],
})
export class AppModule {}
