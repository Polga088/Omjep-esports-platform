import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePredictionDto } from './dto/create-prediction.dto';

type AuthedRequest = { user: { id: string } };

@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('upcoming')
  upcoming() {
    return this.predictionsService.listUpcomingMatches();
  }

  @Get('me')
  myPredictions(@Req() req: AuthedRequest) {
    return this.predictionsService.listMyPredictions(req.user.id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreatePredictionDto) {
    return this.predictionsService.createPrediction(req.user.id, dto);
  }
}
