import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './sync.service';
import { ProClubsService } from './proclubs.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  providers: [SyncService, ProClubsService],
  exports: [SyncService, ProClubsService],
})
export class SyncModule {}
