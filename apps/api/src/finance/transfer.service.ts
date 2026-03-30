import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransferService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateTransfer(buyingTeamId: string, playerId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { user_id: playerId, expires_at: { gt: new Date() } },
    });

    if (!contract) {
      throw new NotFoundException("Ce joueur n'a pas de contrat actif.");
    }

    if (contract.team_id === buyingTeamId) {
      throw new BadRequestException('Ce joueur est déjà dans votre équipe.');
    }

    const buyingTeam = await this.prisma.team.findUnique({
      where: { id: buyingTeamId },
    });

    if (!buyingTeam) {
      throw new NotFoundException('Club acheteur introuvable.');
    }

    if (buyingTeam.budget < contract.release_clause) {
      throw new BadRequestException(
        `Budget insuffisant. Requis : ${contract.release_clause.toLocaleString('fr-FR')}, disponible : ${buyingTeam.budget.toLocaleString('fr-FR')}.`,
      );
    }

    const sellingTeamId = contract.team_id;

    await this.prisma.$transaction([
      this.prisma.team.update({
        where: { id: buyingTeamId },
        data: { budget: { decrement: contract.release_clause } },
      }),
      this.prisma.team.update({
        where: { id: sellingTeamId },
        data: { budget: { increment: contract.release_clause } },
      }),
      this.prisma.transaction.create({
        data: {
          team_id: buyingTeamId,
          amount: -contract.release_clause,
          type: 'TRANSFER',
          description: `Transfert entrant (clause libératoire : ${contract.release_clause.toLocaleString('fr-FR')})`,
        },
      }),
      this.prisma.transaction.create({
        data: {
          team_id: sellingTeamId,
          amount: contract.release_clause,
          type: 'TRANSFER',
          description: `Transfert sortant (clause libératoire : ${contract.release_clause.toLocaleString('fr-FR')})`,
        },
      }),
      this.prisma.teamMember.delete({
        where: {
          user_id_team_id: { user_id: playerId, team_id: sellingTeamId },
        },
      }),
      this.prisma.teamMember.create({
        data: {
          user_id: playerId,
          team_id: buyingTeamId,
          club_role: 'PLAYER',
        },
      }),
      this.prisma.contract.delete({ where: { id: contract.id } }),
    ]);

    return {
      message: 'Transfert effectué avec succès.',
      release_clause: contract.release_clause,
      buying_team_id: buyingTeamId,
      selling_team_id: sellingTeamId,
    };
  }
}
