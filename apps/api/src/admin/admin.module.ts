import { Module } from '@nestjs/common';
import { AdminCompetitionsController } from './admin-competitions.controller';
import { AdminMatchesController } from './admin-matches.controller';

@Module({
  controllers: [AdminCompetitionsController, AdminMatchesController],
})
export class AdminModule {}
