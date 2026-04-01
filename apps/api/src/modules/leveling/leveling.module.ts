import { Module } from '@nestjs/common';
import { LevelingService } from './leveling.service';

@Module({
  providers: [LevelingService],
  exports: [LevelingService],
})
export class LevelingModule {}
