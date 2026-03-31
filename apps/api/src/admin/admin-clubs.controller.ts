import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ClubsService } from '../clubs/clubs.service';
import { AdminValidateClubDto } from '../clubs/dto/admin-validate-club.dto';

@Controller('admin/clubs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminClubsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubsService: ClubsService,
  ) {}

  @Get('pending-validation')
  async listPendingValidation() {
    return this.prisma.club.findMany({
      where: { validation_status: 'PENDING' },
      orderBy: { created_at: 'asc' },
      include: {
        manager: {
          select: { id: true, email: true, ea_persona_name: true },
        },
        _count: { select: { members: true } },
      },
    });
  }

  @Patch(':id/validation')
  async validateClub(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminValidateClubDto,
  ) {
    return this.clubsService.adminValidateClub(id, dto);
  }
}
