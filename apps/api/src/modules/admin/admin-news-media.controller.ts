import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { existsSync, mkdirSync } from 'fs'
import { extname, join } from 'path'
import type { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

function ensureUploadSubdir(...segments: string[]) {
  const dir = join(process.cwd(), 'uploads', ...segments)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

@Controller('admin/news-media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminNewsMediaController {
  @Post('article-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: ExpressRequest, _file: Express.Multer.File, cb) => {
          cb(null, ensureUploadSubdir('news-covers'))
        },
        filename: (_req: ExpressRequest, file: Express.Multer.File, cb) => {
          const ext = extname(file.originalname).toLowerCase()
          const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.webp'
          cb(null, `article-cover-${Date.now()}${safe}`)
        },
      }),
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  uploadArticleCover(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Fichier requis')
    return { url: `/api/v1/uploads/news-covers/${file.filename}` }
  }
}
