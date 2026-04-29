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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { Request as ExpressRequest } from 'express';
import { ClubsService } from './clubs.service';
import { RequestClubCreationDto } from './dto/request-club-creation.dto';
import { AdminValidateClubDto } from './dto/admin-validate-club.dto';
import { KickMemberDto } from './dto/kick-member.dto';
import { CoManagerTargetDto } from './dto/co-manager-target.dto';
import { UpdateManagedClubDto } from './dto/update-managed-club.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

function ensureUploadSubdir(...segments: string[]) {
  const dir = join(process.cwd(), 'uploads', ...segments);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  getMyManagedClub(@Request() req: { user: { id: string } }) {
    return this.clubsService.findManagedClub(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  updateMyManagedClub(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateManagedClubDto,
  ) {
    return this.clubsService.updateManagedClub(req.user.id, dto);
  }

  @Post('me/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: ExpressRequest, _file: Express.Multer.File, cb) => {
          cb(null, ensureUploadSubdir('clubs'));
        },
        filename: (req: ExpressRequest, file: Express.Multer.File, cb) => {
          const user = (req as ExpressRequest & { user: { id: string } }).user;
          const ext = extname(file.originalname).toLowerCase();
          const safe = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
          cb(null, `club-${user.id}-${Date.now()}${safe}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadMyManagedClubLogo(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.clubsService.uploadManagedClubLogo(req.user.id, file);
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

  /** Licenciement d’un joueur (−5000 OC budget club). Réservé au manager désigné (`manager_id`). */
  @Post('kick-member')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  kickMember(
    @Request() req: { user: { id: string } },
    @Body() dto: KickMemberDto,
  ) {
    return this.clubsService.kickMember(req.user.id, dto.target_user_id);
  }

  @Patch('promote-co-manager')
  @UseGuards(JwtAuthGuard)
  promoteCoManager(
    @Request() req: { user: { id: string } },
    @Body() dto: CoManagerTargetDto,
  ) {
    return this.clubsService.promoteCoManager(req.user.id, dto);
  }

  @Patch('demote-co-manager')
  @UseGuards(JwtAuthGuard)
  demoteCoManager(
    @Request() req: { user: { id: string } },
    @Body() dto: CoManagerTargetDto,
  ) {
    return this.clubsService.demoteCoManager(req.user.id, dto);
  }

  /** POST /clubs/:id/sync-stats — stats ProClubs.io → player_stats + XP prestige club */
  @Post(':id/sync-stats')
  @UseGuards(JwtAuthGuard)
  syncClubStats(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clubsService.syncClubStats(req.user.id, id);
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
