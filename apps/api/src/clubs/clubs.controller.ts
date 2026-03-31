import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { RequestClubCreationDto } from './dto/request-club-creation.dto';
import { AdminValidateClubDto } from './dto/admin-validate-club.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  getMyManagedClub(@Request() req: { user: { id: string } }) {
    return this.clubsService.findManagedClub(req.user.id);
  }

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  requestClubCreation(
    @Request() req: { user: { id: string } },
    @Body() dto: RequestClubCreationDto,
  ) {
    return this.clubsService.requestClubCreation(req.user.id, dto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  getAllClubsForAdmin() {
    return this.clubsService.findAllForAdmin();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clubsService.remove(id);
  }

  @Patch(':id/validation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  adminValidateClub(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminValidateClubDto,
  ) {
    return this.clubsService.adminValidateClub(id, dto);
  }
}
