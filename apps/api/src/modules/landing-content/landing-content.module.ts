import { Module } from '@nestjs/common'
import { LandingContentService } from './landing-content.service'
import { PublicLandingMediaController } from './public-landing-media.controller'
import { AdminLandingMediaController } from './admin-landing-media.controller'

@Module({
  controllers: [PublicLandingMediaController, AdminLandingMediaController],
  providers: [LandingContentService],
  exports: [LandingContentService],
})
export class LandingContentModule {}
