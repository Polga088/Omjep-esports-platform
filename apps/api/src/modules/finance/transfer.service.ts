import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class TransferService {
  async initiateTransfer(
    _actorUserId: string,
    _actorRole: string,
    _buyingTeamId: string,
    _playerId: string,
  ) {
    throw new BadRequestException(
      'Le transfert par clause libératoire passe désormais par une offre joueur (POST /transfers/offer puis acceptation).',
    )
  }
}
