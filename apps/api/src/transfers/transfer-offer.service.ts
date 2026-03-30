import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTransferOfferDto } from './dto/create-transfer-offer.dto';

@Injectable()
export class TransferOfferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── POST /transfers/offer ──────────────────────────────────
  async createOffer(requestingUserId: string, dto: CreateTransferOfferDto) {
    // 1. Vérifier que l'utilisateur est manager de l'équipe acheteuse (from_team)
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        user_id_team_id: { user_id: requestingUserId, team_id: dto.from_team_id },
      },
    });

    if (!membership || !['FOUNDER', 'MANAGER', 'CO_MANAGER'].includes(membership.club_role)) {
      throw new ForbiddenException(
        "Vous devez être manager de l'équipe acheteuse pour envoyer une offre.",
      );
    }

    // 2. Vérifier que le joueur appartient bien à l'équipe vendeuse (to_team)
    const playerMembership = await this.prisma.teamMember.findUnique({
      where: {
        user_id_team_id: { user_id: dto.player_id, team_id: dto.to_team_id },
      },
    });

    if (!playerMembership) {
      throw new BadRequestException(
        "Ce joueur n'appartient pas à l'équipe visée.",
      );
    }

    if (dto.from_team_id === dto.to_team_id) {
      throw new BadRequestException('Impossible de faire une offre à votre propre équipe.');
    }

    // 3. Vérifier le budget de l'acheteur
    const buyingTeam = await this.prisma.team.findUnique({
      where: { id: dto.from_team_id },
    });

    if (!buyingTeam) {
      throw new NotFoundException('Équipe acheteuse introuvable.');
    }

    if (buyingTeam.budget < dto.amount) {
      throw new BadRequestException(
        `Budget insuffisant. Requis : ${dto.amount.toLocaleString('fr-FR')}, disponible : ${buyingTeam.budget.toLocaleString('fr-FR')}.`,
      );
    }

    // 4. Vérifier pas d'offre PENDING existante pour ce joueur par cette équipe
    const existingOffer = await this.prisma.transferOffer.findFirst({
      where: {
        player_id: dto.player_id,
        from_team_id: dto.from_team_id,
        status: 'PENDING',
      },
    });

    if (existingOffer) {
      throw new BadRequestException(
        'Une offre en attente existe déjà pour ce joueur de votre part.',
      );
    }

    // 5. Créer l'offre
    const offer = await this.prisma.transferOffer.create({
      data: {
        player_id: dto.player_id,
        from_team_id: dto.from_team_id,
        to_team_id: dto.to_team_id,
        amount: dto.amount,
      },
      include: {
        player: { select: { id: true, ea_persona_name: true } },
        fromTeam: { select: { id: true, name: true } },
        toTeam: { select: { id: true, name: true } },
      },
    });

    // 6. Notifier les managers de l'équipe vendeuse
    await this.notifications.sendToTeamManagers(
      dto.to_team_id,
      '📨 Nouvelle offre de transfert',
      `${offer.fromTeam.name} propose ${dto.amount.toLocaleString('fr-FR')} pour ${offer.player.ea_persona_name ?? 'un joueur'}.`,
      { offer_id: offer.id, type: 'TRANSFER_OFFER_RECEIVED' },
    );

    return offer;
  }

  // ── PATCH /transfers/offer/:id/respond ─────────────────────
  async respondToOffer(
    requestingUserId: string,
    offerId: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    const offer = await this.prisma.transferOffer.findUnique({
      where: { id: offerId },
      include: {
        player: { select: { id: true, ea_persona_name: true } },
        fromTeam: { select: { id: true, name: true, budget: true } },
        toTeam: { select: { id: true, name: true } },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre introuvable.');
    }

    if (offer.status !== 'PENDING') {
      throw new BadRequestException('Cette offre a déjà été traitée.');
    }

    // Seul un manager de l'équipe vendeuse (to_team) peut répondre
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        user_id_team_id: { user_id: requestingUserId, team_id: offer.to_team_id },
      },
    });

    if (!membership || !['FOUNDER', 'MANAGER', 'CO_MANAGER'].includes(membership.club_role)) {
      throw new ForbiddenException(
        "Seul un manager de l'équipe vendeuse peut répondre à cette offre.",
      );
    }

    // ── REJECTED ─────────────────────────────────────────────
    if (status === 'REJECTED') {
      const rejected = await this.prisma.transferOffer.update({
        where: { id: offerId },
        data: { status: 'REJECTED', responded_at: new Date() },
      });

      await this.notifications.sendToTeamManagers(
        offer.from_team_id,
        '❌ Offre refusée',
        `${offer.toTeam.name} a refusé votre offre de ${offer.amount.toLocaleString('fr-FR')} pour ${offer.player.ea_persona_name ?? 'un joueur'}.`,
        { offer_id: offerId, type: 'TRANSFER_OFFER_REJECTED' },
      );

      return rejected;
    }

    // ── ACCEPTED — Transaction atomique ──────────────────────
    // Re-vérifier le budget de l'acheteur (il a pu changer depuis l'offre)
    const freshBuyingTeam = await this.prisma.team.findUnique({
      where: { id: offer.from_team_id },
    });

    if (!freshBuyingTeam || freshBuyingTeam.budget < offer.amount) {
      throw new BadRequestException(
        "Le budget de l'équipe acheteuse est désormais insuffisant pour cette offre.",
      );
    }

    // Trouver le contrat actif du joueur dans l'équipe vendeuse
    const currentContract = await this.prisma.contract.findFirst({
      where: {
        user_id: offer.player_id,
        team_id: offer.to_team_id,
        expires_at: { gt: new Date() },
      },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de l'offre
      const accepted = await tx.transferOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED', responded_at: new Date() },
      });

      // 2. Transférer l'argent
      await tx.team.update({
        where: { id: offer.from_team_id },
        data: { budget: { decrement: offer.amount } },
      });

      await tx.team.update({
        where: { id: offer.to_team_id },
        data: { budget: { increment: offer.amount } },
      });

      // 3. Enregistrer les transactions financières
      await tx.transaction.create({
        data: {
          team_id: offer.from_team_id,
          amount: -offer.amount,
          type: 'TRANSFER',
          description: `Transfert de ${offer.player.ea_persona_name ?? 'joueur'} depuis ${offer.toTeam.name} (${offer.amount.toLocaleString('fr-FR')})`,
        },
      });

      await tx.transaction.create({
        data: {
          team_id: offer.to_team_id,
          amount: offer.amount,
          type: 'TRANSFER',
          description: `Vente de ${offer.player.ea_persona_name ?? 'joueur'} vers ${offer.fromTeam.name} (${offer.amount.toLocaleString('fr-FR')})`,
        },
      });

      // 4. Déplacer le joueur : supprimer de l'ancienne équipe, ajouter à la nouvelle
      await tx.teamMember.delete({
        where: {
          user_id_team_id: { user_id: offer.player_id, team_id: offer.to_team_id },
        },
      });

      await tx.teamMember.create({
        data: {
          user_id: offer.player_id,
          team_id: offer.from_team_id,
          club_role: 'PLAYER',
        },
      });

      // 5. Mettre à jour le contrat : supprimer l'ancien, créer le nouveau
      if (currentContract) {
        await tx.contract.delete({ where: { id: currentContract.id } });
      }

      await tx.contract.create({
        data: {
          user_id: offer.player_id,
          team_id: offer.from_team_id,
          salary: currentContract?.salary ?? 10_000,
          release_clause: offer.amount * 1.5,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
        },
      });

      // 6. Annuler les autres offres PENDING pour ce joueur
      await tx.transferOffer.updateMany({
        where: {
          player_id: offer.player_id,
          status: 'PENDING',
          id: { not: offerId },
        },
        data: { status: 'CANCELLED', responded_at: new Date() },
      });

      return accepted;
    });

    // Notifier l'équipe acheteuse du succès
    await this.notifications.sendToTeamManagers(
      offer.from_team_id,
      '✅ Transfert accepté !',
      `${offer.toTeam.name} a accepté votre offre de ${offer.amount.toLocaleString('fr-FR')} pour ${offer.player.ea_persona_name ?? 'un joueur'}. Le joueur rejoint votre effectif.`,
      { offer_id: offerId, type: 'TRANSFER_OFFER_ACCEPTED' },
    );

    // Notifier le joueur
    await this.notifications.send(
      offer.player_id,
      '🔄 Vous avez été transféré',
      `Vous rejoignez ${offer.fromTeam.name} suite à un transfert de ${offer.amount.toLocaleString('fr-FR')}.`,
      { offer_id: offerId, type: 'PLAYER_TRANSFERRED' },
    );

    return result;
  }

  // ── GET /transfers/offers ──────────────────────────────────
  async listOffers(filters?: { team_id?: string; status?: string }) {
    return this.prisma.transferOffer.findMany({
      where: {
        ...(filters?.team_id && {
          OR: [
            { from_team_id: filters.team_id },
            { to_team_id: filters.team_id },
          ],
        }),
        ...(filters?.status && { status: filters.status as any }),
      },
      include: {
        player: { select: { id: true, ea_persona_name: true, preferred_position: true } },
        fromTeam: { select: { id: true, name: true, logo_url: true } },
        toTeam: { select: { id: true, name: true, logo_url: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  // ── GET /transfers/offer/:id ───────────────────────────────
  async getOffer(offerId: string) {
    const offer = await this.prisma.transferOffer.findUnique({
      where: { id: offerId },
      include: {
        player: { select: { id: true, ea_persona_name: true, preferred_position: true } },
        fromTeam: { select: { id: true, name: true, logo_url: true, budget: true } },
        toTeam: { select: { id: true, name: true, logo_url: true } },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre introuvable.');
    }

    return offer;
  }
}
