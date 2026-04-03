import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { CompetitionsModule } from '../competitions/competitions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CompetitionsModule, AuthModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
