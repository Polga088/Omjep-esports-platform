import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './sync.service';

@Module({
  imports: [
    HttpModule.register({
      // Global timeout of 10 s and up to 3 retries can be configured
      // here or overridden per-request in SyncService.
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
