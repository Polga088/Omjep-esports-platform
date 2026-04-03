import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { DrawDto } from './dto/draw-competition.dto';
import { ValidatePotsDto } from './dto/validate-pots.dto';
import { AdminCompetitionsService } from './admin-competitions.service';
import { UpdateCompetitionTransferMarketDto } from './dto/update-competition-transfer-market.dto';
import { GenerateLeagueCalendarDto } from './dto/generate-league-calendar.dto';

/**
 * Gestion des compétitions — réservé aux administrateurs.
 * La suppression d'une compétition propage la cascade (matchs, événements, etc.).
 */
@Controller('admin/competitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCompetitionsController {
  constructor(private readonly adminCompetitionsService: AdminCompetitionsService) {}

  @Get()
  findAll() {
    return this.adminCompetitionsService.findAll();
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCompetitionsService.deleteCompetition(id);
  }

  /**
   * Maintenance : supprime les matchs dont competition_id ne référence aucune compétition.
   */
  @Post('cleanup-orphan-matches')
  cleanupOrphanMatches() {
    return this.adminCompetitionsService.cleanupOrphanMatches();
  }

  @Post()
  createCompetition(@Body() dto: CreateCompetitionDto) {
    return this.adminCompetitionsService.createCompetition(dto);
  }

  @Patch(':id/transfer-market')
  updateTransferMarket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompetitionTransferMarketDto,
  ) {
    return this.adminCompetitionsService.updateTransferMarketOpen(
      id,
      dto.isTransferMarketOpen,
    );
  }

  @Post(':id/generate-calendar')
  generateCalendar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: GenerateLeagueCalendarDto,
  ) {
    return this.adminCompetitionsService.generateCalendar(id, dto ?? {});
  }

  /** Vérifie l’intégrité des chapeaux (UCL) avant de lancer le tirage manuel. */
  @Post(':id/draw/validate-pots')
  validatePots(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidatePotsDto,
  ) {
    return this.adminCompetitionsService.validatePots(id, dto);
  }

  @Post(':id/draw')
  performDraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DrawDto,
  ) {
    return this.adminCompetitionsService.performDraw(id, dto);
  }
}
