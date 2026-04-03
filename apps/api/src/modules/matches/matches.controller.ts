import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubmitScoreReportDto } from './dto/submit-score-report.dto';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('my-team')
  @UseGuards(JwtAuthGuard)
  findMyTeamMatches(@Request() req: { user: { id: string } }) {
    return this.matchesService.findMyTeamMatches(req.user.id);
  }

  @Get('my-schedule')
  @UseGuards(JwtAuthGuard)
  findMySchedule(@Request() req: { user: { id: string } }) {
    return this.matchesService.findMyUpcomingSchedule(req.user.id);
  }

  @Post(':id/score-report')
  @UseGuards(JwtAuthGuard)
  submitScoreReport(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitScoreReportDto,
  ) {
    return this.matchesService.submitScoreReport(
      req.user.id,
      id,
      body.home_score,
      body.away_score,
    );
  }

  @Get('competition/:id')
  findCompetitionMatches(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchesService.findCompetitionMatches(id);
  }
}
