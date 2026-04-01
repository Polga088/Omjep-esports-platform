import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { TransferService } from './transfer.service';
import { AuthModule } from '../auth';

@Module({
  imports: [AuthModule],
  controllers: [FinanceController],
  providers: [FinanceService, TransferService],
  exports: [FinanceService, TransferService],
})
export class FinanceModule {}
