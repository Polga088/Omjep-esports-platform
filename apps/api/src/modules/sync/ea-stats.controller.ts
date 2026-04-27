import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { EaStatsService } from './ea-stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class SyncEaStatsDto {
  proclubsUrl!: string;
}

@Controller('sync/ea-stats')
export class EaStatsController {
  constructor(private readonly eaStatsService: EaStatsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Req() req: { user: { id: string } }) {
    return this.eaStatsService.getStatsForUser(req.user.id);
  }

  @Get('my-club')
  @UseGuards(JwtAuthGuard)
  async getMyClubStats(@Req() req: { user: { id: string } }) {
    return this.eaStatsService.getStatsForMyClub(req.user.id);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncMyStats(
    @Req() req: { user: { id: string } },
    @Body() dto: SyncEaStatsDto,
  ) {
    return this.eaStatsService.syncProfile(req.user.id, dto.proclubsUrl);
  }

  @Post('sync-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async syncAllNow() {
    return this.eaStatsService.autoSyncAll();
  }
}
