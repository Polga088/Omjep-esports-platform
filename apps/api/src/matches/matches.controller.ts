import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('my-team')
  @UseGuards(JwtAuthGuard)
  findMyTeamMatches(@Request() req: { user: { id: string } }) {
    return this.matchesService.findMyTeamMatches(req.user.id);
  }

  @Get('competition/:id')
  findCompetitionMatches(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchesService.findCompetitionMatches(id);
  }
}
