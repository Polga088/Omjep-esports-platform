import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WalletsService } from '../wallets/wallets.service';
import { AdminGrantCoinsDto } from '../wallets/dto/admin-grant-coins.dto';

@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminWalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post('grant')
  grant(@Body() dto: AdminGrantCoinsDto) {
    return this.walletsService.adminGrantCoins(dto);
  }
}
