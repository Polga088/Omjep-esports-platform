import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { MatchSyncService } from './match-sync.service'

@Controller('sync/matches')
@UseGuards(JwtAuthGuard)
export class MatchSyncController {
  constructor(private readonly matchSync: MatchSyncService) {}

  @Post(':matchId/run')
  run(@Request() req: { user: { id: string } }, @Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.matchSync.syncMatch(matchId, req.user.id)
  }

  @Get(':matchId/status')
  status(@Request() req: { user: { id: string } }, @Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.matchSync.getStatus(matchId, req.user.id)
  }
}
