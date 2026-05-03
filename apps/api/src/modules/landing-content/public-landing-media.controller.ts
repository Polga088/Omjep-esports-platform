import { Controller, Get } from '@nestjs/common'
import { LandingContentService } from './landing-content.service'

@Controller('public')
export class PublicLandingMediaController {
  constructor(private readonly landingContent: LandingContentService) {}

  @Get('landing-media')
  getLandingMedia() {
    return this.landingContent.getPublicPayload()
  }
}
