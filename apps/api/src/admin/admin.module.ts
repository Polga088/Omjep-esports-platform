import { Module } from '@nestjs/common';
import { AdminCompetitionsController } from './admin-competitions.controller';

@Module({
  controllers: [AdminCompetitionsController],
})
export class AdminModule {}
