import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TransferOfferService } from './transfer-offer.service';
import { CreateTransferOfferDto } from './dto/create-transfer-offer.dto';
import { RespondTransferOfferDto } from './dto/respond-transfer-offer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransfersController {
  constructor(private readonly transferOfferService: TransferOfferService) {}

  @Post('offer')
  @Roles('MANAGER', 'ADMIN')
  createOffer(@Req() req: any, @Body() dto: CreateTransferOfferDto) {
    return this.transferOfferService.createOffer(req.user.id, dto);
  }

  @Patch('offer/:id/respond')
  @Roles('MANAGER', 'ADMIN')
  respondToOffer(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondTransferOfferDto,
  ) {
    return this.transferOfferService.respondToOffer(req.user.id, id, dto.status);
  }

  @Get('offers')
  listOffers(
    @Query('team_id') teamId?: string,
    @Query('status') status?: string,
  ) {
    return this.transferOfferService.listOffers({ team_id: teamId, status });
  }

  @Get('offer/:id')
  getOffer(@Param('id', ParseUUIDPipe) id: string) {
    return this.transferOfferService.getOffer(id);
  }
}
