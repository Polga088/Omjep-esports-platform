import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictController } from './predict.controller';
import { PredictionsService } from './predictions.service';
import { AuthModule } from '../auth';
import { CompetitionsModule } from '../competitions/competitions.module';

@Module({
  imports: [AuthModule, CompetitionsModule],
  controllers: [PredictionsController, PredictController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
