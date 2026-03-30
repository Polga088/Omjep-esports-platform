import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('profile')
  getMyProfile(@Req() req: { user: { id: string } }) {
    return this.gamification.getGamificationProfile(req.user.id);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.gamification.getLeaderboard(
      limit ? Math.min(parseInt(limit, 10), 50) : 20,
    );
  }
}
