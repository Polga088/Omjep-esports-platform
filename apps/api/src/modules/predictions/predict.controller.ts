import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PredictionsService } from './predictions.service';

type AuthedRequest = { user: { id: string } };

@Controller('predict')
@UseGuards(JwtAuthGuard)
export class PredictController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('stats')
  stats(@Req() req: AuthedRequest) {
    return this.predictionsService.getUserStats(req.user.id);
  }
}
