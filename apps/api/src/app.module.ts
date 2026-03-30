import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';
import { AdminModule } from './admin/admin.module';
import { MatchesModule } from './matches/matches.module';
import { CompetitionsModule } from './competitions/competitions.module';

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
    SyncModule,
    AdminModule,
  ],
})
export class AppModule {}
