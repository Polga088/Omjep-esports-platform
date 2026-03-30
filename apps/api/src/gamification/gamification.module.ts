import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { LevelingModule } from '../leveling/leveling.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, LevelingModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
