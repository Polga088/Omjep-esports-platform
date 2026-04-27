import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClubRole } from '@omjep/database';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClubRoles } from '../auth/decorators/club-roles.decorator';
import { ClubRolesGuard } from '../auth/guards/club-roles.guard';
import { SubmitScoreReportDto } from './dto/submit-score-report.dto';
import { ReportMatchDto } from './dto/report-match.dto';
import { ConfirmMatchDto } from './dto/confirm-match.dto';

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
  @UseGuards(JwtAuthGuard, ClubRolesGuard)
  @ClubRoles(
    'match_param',
    ClubRole.FOUNDER,
    ClubRole.MANAGER,
    ClubRole.CO_MANAGER,
  )
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
      body.proof_url,
    );
  }

  @Patch(':id/report')
  @UseGuards(JwtAuthGuard)
  reportMatch(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReportMatchDto,
  ) {
    return this.matchesService.reportMatch(req.user.id, id, body);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  confirmMatch(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfirmMatchDto,
  ) {
    return this.matchesService.confirmMatch(req.user.id, id, body);
  }

  @Get('competition/:id')
  findCompetitionMatches(@Param('id', ParseUUIDPipe) id: string) {
    return this.matchesService.findCompetitionMatches(id);
  }
}
