import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { existsSync, mkdirSync } from 'fs'
import { extname, join } from 'path'
import type { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { PatchPublicLandingMediaDto } from './dto/patch-public-landing-media.dto'
import {
  CHAMPION_MEDIA_KEYS,
  COMPETITION_MEDIA_KEYS,
  type ChampionMediaKey,
  type CompetitionMediaKey,
  LandingContentService,
} from './landing-content.service'

function ensureUploadSubdir(...segments: string[]) {
  const dir = join(process.cwd(), 'uploads', ...segments)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

const imageMulter = (subdir: string, prefix: string) =>
  FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req: ExpressRequest, _file: Express.Multer.File, cb) => {
        cb(null, ensureUploadSubdir('landing', subdir))
      },
      filename: (_req: ExpressRequest, file: Express.Multer.File, cb) => {
        const ext = extname(file.originalname).toLowerCase()
        const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.webp'
        cb(null, `${prefix}-${Date.now()}${safe}`)
      },
    }),
    limits: { fileSize: 4 * 1024 * 1024 },
  })

@Controller('admin/landing-media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminLandingMediaController {
  constructor(private readonly landingContent: LandingContentService) {}

  @Get()
  getOne() {
    return this.landingContent.getAdminRecord()
  }

  @Patch()
  patch(@Body() body: PatchPublicLandingMediaDto) {
    return this.landingContent.patch(body)
  }

  @Post('upload/palmares-hero')
  @UseInterceptors(imageMulter('palmares', 'palmares-hero'))
  async uploadPalmaresHero(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Fichier requis')
    const url = `/api/v1/uploads/landing/palmares/${file.filename}`
    await this.landingContent.setPalmaresHeroVisualUrl(url)
    return { url }
  }

  @Post('upload/palmares-competition/:competitionId/:kind')
  @UseInterceptors(imageMulter('palmares', 'palmares-comp'))
  async uploadCompetitionAsset(
    @Param('competitionId') competitionId: string,
    @Param('kind') kind: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!COMPETITION_MEDIA_KEYS.includes(competitionId as CompetitionMediaKey)) {
      throw new BadRequestException('Compétition inconnue')
    }
    if (kind !== 'trophy' && kind !== 'card') {
      throw new BadRequestException('kind doit être trophy ou card')
    }
    if (!file) throw new BadRequestException('Fichier requis')
    const url = `/api/v1/uploads/landing/palmares/${file.filename}`
    const field = kind === 'trophy' ? 'trophyImageUrl' : 'cardImageUrl'
    await this.landingContent.setCompetitionMediaUrl(competitionId as CompetitionMediaKey, field, url)
    return { url }
  }

  @Post('upload/palmares-champion/:championKey/badge')
  @UseInterceptors(imageMulter('palmares', 'palmares-champion'))
  async uploadChampionBadge(
    @Param('championKey') championKey: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!CHAMPION_MEDIA_KEYS.includes(championKey as ChampionMediaKey)) {
      throw new BadRequestException('Champion inconnu')
    }
    if (!file) throw new BadRequestException('Fichier requis')
    const url = `/api/v1/uploads/landing/palmares/${file.filename}`
    await this.landingContent.setChampionBadgeUrl(championKey as ChampionMediaKey, url)
    return { url }
  }
}
