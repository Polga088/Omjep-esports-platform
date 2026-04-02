import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransferOfferService } from './transfer-offer.service';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [NewsModule],
  controllers: [TransfersController],
  providers: [TransferOfferService],
  exports: [TransferOfferService],
})
export class TransfersModule {}
