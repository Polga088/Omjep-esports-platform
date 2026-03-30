import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransferOfferService } from './transfer-offer.service';

@Module({
  controllers: [TransfersController],
  providers: [TransferOfferService],
  exports: [TransferOfferService],
})
export class TransfersModule {}
