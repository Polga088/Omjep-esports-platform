import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthedRequest = { user: { id: string } };

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  /** Catalogue (articles disponibles). */
  @Get('items')
  listItems() {
    return this.storeService.listAvailableItems();
  }

  @Get('my-inventory')
  @UseGuards(JwtAuthGuard)
  myInventory(@Req() req: AuthedRequest) {
    return this.storeService.getMyInventory(req.user.id);
  }

  @Post('buy/:itemId')
  @UseGuards(JwtAuthGuard)
  buy(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.storeService.buyItem(req.user.id, itemId);
  }
}
