import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExchangeWalletDto } from './dto/exchange-wallet.dto';
import { ExchangeReverseWalletDto } from './dto/exchange-reverse-wallet.dto';

type AuthedRequest = { user: { id: string } };

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('history')
  history(@Req() req: AuthedRequest) {
    return this.walletsService.getWalletHistory(req.user.id);
  }

  @Post('exchange')
  exchange(@Req() req: AuthedRequest, @Body() dto: ExchangeWalletDto) {
    return this.walletsService.exchangeOcToJepy(req.user.id, dto.oc_amount);
  }

  @Post('exchange-reverse')
  exchangeReverse(
    @Req() req: AuthedRequest,
    @Body() dto: ExchangeReverseWalletDto,
  ) {
    return this.walletsService.exchangeJepyToOmjep(req.user.id, dto.jepy_amount);
  }
}
