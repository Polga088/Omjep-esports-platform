import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '@api/prisma/prisma.service';
import { ClubsService } from '../clubs/clubs.service';
import { AdminValidateClubDto } from '../clubs/dto/admin-validate-club.dto';
import { UpdateAdminClubDto } from '../clubs/dto/update-admin-club.dto';

function ensureUploadSubdir(...segments: string[]) {
  const dir = join(process.cwd(), 'uploads', ...segments)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

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

  @Patch(':id')
  async updateClub(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminClubDto,
  ) {
    return this.clubsService.updateClubByAdmin(id, dto);
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: ExpressRequest, _file: Express.Multer.File, cb) => {
          cb(null, ensureUploadSubdir('clubs'))
        },
        filename: (_req: ExpressRequest, file: Express.Multer.File, cb) => {
          const ext = extname(file.originalname).toLowerCase()
          const safe = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg'
          cb(null, `admin-club-${Date.now()}${safe}`)
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadClubLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.clubsService.uploadClubLogoByAdmin(id, file)
  }
}
