import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { LevelingModule } from '../leveling/leveling.module';

@Module({
  imports: [LevelingModule],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
