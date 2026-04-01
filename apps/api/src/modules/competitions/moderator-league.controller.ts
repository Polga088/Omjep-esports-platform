import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModeratorLeagueService } from './moderator-league.service';
import { CreateModeratorMatchDto } from './dto/create-moderator-match.dto';
import { ModeratorValidateScoreDto } from './dto/moderator-validate-score.dto';

@Controller('moderator/league')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MODERATOR', 'ADMIN')
export class ModeratorLeagueController {
  constructor(private readonly moderatorLeague: ModeratorLeagueService) {}

  @Get('competitions')
  listCompetitions() {
    return this.moderatorLeague.listCompetitions();
  }

  @Get('matches')
  listMatches(@Query('competition_id') competitionId?: string) {
    return this.moderatorLeague.listMatches(competitionId);
  }

  @Post('competitions/:id/matches')
  createMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateModeratorMatchDto,
  ) {
    return this.moderatorLeague.createMatch(id, dto);
  }

  @Post('competitions/:id/generate-calendar')
  generateCalendar(@Param('id', ParseUUIDPipe) id: string) {
    return this.moderatorLeague.generateCalendar(id);
  }

  @Post('matches/:id/validate-score')
  validateScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ModeratorValidateScoreDto,
  ) {
    return this.moderatorLeague.validateScore(id, body);
  }
}
