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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { TransferOfferService } from './transfer-offer.service';
import { CreateTransferOfferDto } from './dto/create-transfer-offer.dto';
import { PlayerRespondOfferDto } from './dto/player-respond-offer.dto';
import { BuyerRespondOfferDto } from './dto/buyer-respond-offer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransfersController {
  constructor(private readonly transferOfferService: TransferOfferService) {}

  @Post('offer')
  @Roles('MANAGER', 'ADMIN', 'PLAYER')
  createOffer(@Req() req: any, @Body() dto: CreateTransferOfferDto) {
    return this.transferOfferService.createOffer(req.user.id, dto);
  }

  @Patch('offer/:id/player-respond')
  @Roles('PLAYER', 'MANAGER', 'ADMIN')
  playerRespond(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlayerRespondOfferDto,
  ) {
    return this.transferOfferService.playerRespond(req.user.id, id, dto);
  }

  /** Le joueur accepte l’offre : transfert OC, nouveau contrat, changement de club. */
  @Post('offer/:id/accept')
  @Roles('PLAYER', 'ADMIN')
  acceptOffer(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.transferOfferService.acceptOffer(req.user.id, id);
  }

  /** Alias pratique (REST) — même effet que POST `offer/:id/accept`. */
  @Patch('accept/:id')
  @Roles('PLAYER', 'ADMIN')
  acceptOfferPatch(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.transferOfferService.acceptOffer(req.user.id, id);
  }

  /** Le joueur refuse l’offre (statut REJECTED). */
  @Patch('reject/:id')
  @Roles('PLAYER', 'ADMIN')
  rejectOfferPatch(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.transferOfferService.playerRespond(req.user.id, id, { action: 'REJECT' });
  }

  @Patch('offer/:id/buyer-respond')
  @Roles('MANAGER', 'ADMIN', 'PLAYER')
  buyerRespond(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BuyerRespondOfferDto,
  ) {
    return this.transferOfferService.buyerManagerRespond(req.user.id, id, dto);
  }

  @Get('offers')
  listOffers(
    @Query('team_id') teamId?: string,
    @Query('status') status?: string,
  ) {
    return this.transferOfferService.listOffers({ team_id: teamId, status });
  }

  @Get('market-status')
  transferMarketStatus(@Req() req: { user: { id: string } }) {
    return this.transferOfferService.getTransferMarketStatusForUser(
      req.user.id,
    );
  }

  @Get('offers/as-player')
  listAsPlayer(@Req() req: any) {
    return this.transferOfferService.listOffersAsPlayer(req.user.id);
  }

  @Get('offer/:id')
  getOffer(@Param('id', ParseUUIDPipe) id: string) {
    return this.transferOfferService.getOffer(id);
  }

  /** 📋 Agents libres : joueurs sans club ou contrat expiré */
  @Get('free-agents')
  getFreeAgents(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('position') position?: string,
    /** Exclut les joueurs pour lesquels ce club a déjà une offre en attente (PENDING / COUNTER_OFFER) */
    @Query('team_id') teamId?: string,
  ) {
    return this.transferOfferService.getFreeAgents(limit, position, teamId);
  }
}
