/// <reference types="multer" />
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

function ensureUploadSubdir(...segments: string[]) {
  const dir = join(process.cwd(), 'uploads', ...segments);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Req() req: { user: { id: string } }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb) => {
          cb(null, ensureUploadSubdir('avatars'));
        },
        filename: (req: Request, file: Express.Multer.File, cb) => {
          const user = (req as Request & { user: { id: string } }).user;
          const ext = extname(file.originalname).toLowerCase();
          const safe = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
            ? ext
            : '.jpg';
          cb(null, `${user.id}-${Date.now()}${safe}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.usersService.saveAvatarFromUpload(req.user.id, file);
  }

  @Post('profile/banner')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb) => {
          cb(null, ensureUploadSubdir('banners'));
        },
        filename: (req: Request, file: Express.Multer.File, cb) => {
          const user = (req as Request & { user: { id: string } }).user;
          const ext = extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `${user.id}-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  uploadBanner(
    @Req() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.usersService.saveBannerFromUpload(req.user.id, file);
  }

  @Get(':id/profile-card')
  getProfileCard(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProfileCard(id);
  }

  @Get(':id/market-value')
  getMarketValue(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getMarketValue(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminCreate(@Body() dto: AdminCreateUserDto) {
    return this.usersService.adminCreate(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminUpdate(
    @Req() req: Request & { user: { id: string; role: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.usersService.adminUpdate(id, dto, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.usersService.remove(id, req.user.id);
  }
}
