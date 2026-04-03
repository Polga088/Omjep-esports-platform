import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTransferOfferDto } from './dto/create-transfer-offer.dto';
import { PlayerRespondOfferDto } from './dto/player-respond-offer.dto';
import { BuyerRespondOfferDto } from './dto/buyer-respond-offer.dto';
import type { TransferOfferStatus, Position } from '@omjep/shared';

const STAFF_ROLES = ['FOUNDER', 'MANAGER', 'CO_MANAGER'] as const;

function contractEndDate(start: Date, months: number): Date {
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d;
}

function totalSigningCost(transferFee: number, salary: number): number {
  return transferFee + salary;
}

function formatOc(n: number): string {
  return `${Number.isFinite(n) ? n.toLocaleString('fr-FR') : '0'} OC`;
}

const TRANSFER_NOTIF_OPTS = { notificationType: 'TRANSFER' as const, link: '/dashboard/transfers' };

@Injectable()
export class TransferOfferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Clubs in a competition with `isTransferMarketOpen: false` cannot initiate or finalize
   * transfers that fall under that competition (buyer in closed comp, or buyer+seller share a closed comp).
   */
  private async assertTransferMarketOpen(
    fromTeamId: string,
    toTeamId: string | null,
  ) {
    const buyerInClosed = await this.prisma.competitionTeam.findMany({
      where: {
        team_id: fromTeamId,
        competition: { isTransferMarketOpen: false },
      },
      select: { competition_id: true },
    });
    const closedCompIds = buyerInClosed.map((r) => r.competition_id);
    if (closedCompIds.length === 0) {
      return;
    }
    if (toTeamId == null) {
      throw new ForbiddenException('Marché des transferts clos');
    }
    const sharedClosed = await this.prisma.competitionTeam.findFirst({
      where: {
        team_id: toTeamId,
        competition_id: { in: closedCompIds },
      },
    });
    if (sharedClosed) {
      throw new ForbiddenException('Marché des transferts clos');
    }
  }

  /** Pour l’UI Mercato : l’utilisateur appartient à un club inscrit dans une compétition au marché fermé. */
  async getTransferMarketStatusForUser(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { user_id: userId },
      select: { team_id: true },
    });
    if (memberships.length === 0) {
      return { transferMarketOpen: true as const };
    }
    const teamIds = memberships.map((m) => m.team_id);
    const hit = await this.prisma.competitionTeam.findFirst({
      where: {
        team_id: { in: teamIds },
        competition: { isTransferMarketOpen: false },
      },
      include: { competition: { select: { name: true } } },
    });
    return {
      transferMarketOpen: !hit,
      closedCompetitionName: hit?.competition.name ?? undefined,
    };
  }

  // ── POST /transfers/offer ──────────────────────────────────
  async createOffer(requestingUserId: string, dto: CreateTransferOfferDto) {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        user_id_team_id: { user_id: requestingUserId, team_id: dto.from_team_id },
      },
    });

    if (!membership || !STAFF_ROLES.includes(membership.club_role as (typeof STAFF_ROLES)[number])) {
      throw new ForbiddenException(
        "Vous devez être dirigeant du club acheteur pour envoyer une offre.",
      );
    }

    const toTeamId =
      dto.to_team_id === undefined || dto.to_team_id === null || dto.to_team_id === ''
        ? null
        : dto.to_team_id;

    // to_team_id absent / null = signature libre (recrutement direct) — pas de contrôle d’historique club
    if (toTeamId != null) {
      const playerMembership = await this.prisma.teamMember.findUnique({
        where: {
          user_id_team_id: { user_id: dto.player_id, team_id: toTeamId },
        },
      });
      if (!playerMembership) {
        throw new BadRequestException("Ce joueur n'appartient pas au club indiqué.");
      }
      if (dto.from_team_id === toTeamId) {
        throw new BadRequestException('Impossible de transférer vers le même club.');
      }
    }

    const buyingTeam = await this.prisma.club.findUnique({
      where: { id: dto.from_team_id },
    });

    if (!buyingTeam) {
      throw new NotFoundException('Club acheteur introuvable.');
    }

    const salaryAnnual =
      dto.salaryPropose != null && dto.salaryPropose > 0
        ? dto.salaryPropose * 52
        : dto.offered_salary;
    const clauseVal =
      dto.releaseClausePropose != null && dto.releaseClausePropose > 0
        ? dto.releaseClausePropose
        : dto.offered_clause;

    if (
      salaryAnnual == null ||
      !Number.isFinite(salaryAnnual) ||
      salaryAnnual <= 0 ||
      clauseVal == null ||
      !Number.isFinite(clauseVal) ||
      clauseVal <= 0
    ) {
      throw new BadRequestException(
        'Indiquez un salaire (hebdomadaire ou annuel) et une clause libératoire.',
      );
    }

    const offerAmount = totalSigningCost(dto.transfer_fee, salaryAnnual);
    if (buyingTeam.budget < offerAmount) {
      throw new BadRequestException('Budget club insuffisant');
    }

    const existingOffer = await this.prisma.transferOffer.findFirst({
      where: {
        player_id: dto.player_id,
        from_team_id: dto.from_team_id,
        status: { in: ['PENDING', 'COUNTER_OFFER'] },
      },
    });

    if (existingOffer) {
      throw new BadRequestException(
        'Une négociation en cours existe déjà pour ce joueur de votre part.',
      );
    }

    await this.assertTransferMarketOpen(dto.from_team_id, toTeamId);

    const offer = await this.prisma.transferOffer.create({
      data: {
        player_id: dto.player_id,
        from_team_id: dto.from_team_id,
        to_team_id: toTeamId,
        transfer_fee: dto.transfer_fee,
        offered_salary: salaryAnnual,
        offered_clause: clauseVal,
        duration_months: dto.duration_months,
        status: 'PENDING',
        negotiation_turn: 'PLAYER',
      },
      include: {
        player: { select: { id: true, ea_persona_name: true } },
        fromTeam: { select: { id: true, name: true } },
        toTeam: { select: { id: true, name: true } },
      },
    });

    if (toTeamId != null) {
      await this.notifications.sendToTeamManagers(
        toTeamId,
        '📨 Offre de transfert (négociation joueur)',
        `${offer.fromTeam.name} propose ${formatOc(dto.transfer_fee)} d'indemnité pour ${offer.player.ea_persona_name ?? 'un joueur'} (salaire annuel ${formatOc(salaryAnnual)}, clause ${formatOc(clauseVal)}) — le joueur doit répondre.`,
        { offer_id: offer.id, type: 'TRANSFER_OFFER_RECEIVED' },
        'info',
        TRANSFER_NOTIF_OPTS,
      );
    }

    const weeklyOc = Math.round(salaryAnnual / 52);
    const weeklyStr = weeklyOc.toLocaleString('fr-FR');
    await this.notifications.sendNotification(
      dto.player_id,
      '💬 Nouvelle proposition de transfert',
      `Club ${offer.fromTeam.name} : indemnité ${formatOc(dto.transfer_fee)}, salaire annuel ${formatOc(salaryAnnual)}, clause libératoire ${formatOc(clauseVal)} (${weeklyStr} OC/semaine).`,
      'info',
      {
        type: 'TRANSFER_OFFER_RECEIVED',
        offer_id: offer.id,
        from_team_name: offer.fromTeam.name,
      },
      TRANSFER_NOTIF_OPTS,
    );

    await this.notifications.sendToTeamManagers(
      dto.from_team_id,
      '✉️ Offre envoyée',
      `Proposition à ${offer.player.ea_persona_name ?? 'le joueur'} : ${formatOc(dto.transfer_fee)} de frais + ${formatOc(salaryAnnual)}/an de salaire (total engagement année 1 : ${formatOc(totalSigningCost(dto.transfer_fee, salaryAnnual))}) — en attente de réponse.`,
      { type: 'TRANSFER_OFFER_SENT', offer_id: offer.id },
      'info',
      TRANSFER_NOTIF_OPTS,
    );

    return offer;
  }

  // ── POST /transfers/offer/:id/accept ───────────────────────
  /** Acceptation par le joueur (équivalent à PATCH player-respond { action: ACCEPT }). */
  async acceptOffer(requestingUserId: string, offerId: string) {
    return this.playerRespond(requestingUserId, offerId, { action: 'ACCEPT' });
  }

  // ── PATCH /transfers/offer/:id/player-respond ──────────────
  async playerRespond(
    requestingUserId: string,
    offerId: string,
    dto: PlayerRespondOfferDto,
  ) {
    const offer = await this.loadOfferForMutation(offerId);

    if (offer.player_id !== requestingUserId) {
      throw new ForbiddenException('Seul le joueur concerné peut répondre.');
    }

    if (offer.negotiation_turn !== 'PLAYER') {
      throw new BadRequestException("Ce n'est pas à vous de répondre pour l'instant.");
    }

    if (!['PENDING', 'COUNTER_OFFER'].includes(offer.status)) {
      throw new BadRequestException('Cette offre est déjà clôturée.');
    }

    if (dto.action === 'REJECT') {
      return this.closeOfferRejected(offer, 'player');
    }

    if (dto.action === 'COUNTER') {
      await this.assertTransferMarketOpen(
        offer.from_team_id,
        offer.to_team_id,
      );
      const hasChange =
        dto.transfer_fee != null ||
        dto.offered_salary != null ||
        dto.offered_clause != null;
      if (!hasChange) {
        throw new BadRequestException(
          'Indiquez au moins une contre-proposition (frais, salaire ou clause).',
        );
      }
      const updated = await this.prisma.transferOffer.update({
        where: { id: offerId },
        data: {
          transfer_fee: dto.transfer_fee ?? offer.transfer_fee,
          offered_salary: dto.offered_salary ?? offer.offered_salary,
          offered_clause: dto.offered_clause ?? offer.offered_clause,
          status: 'COUNTER_OFFER',
          negotiation_turn: 'BUYING_CLUB',
          responded_at: new Date(),
        },
        include: {
          player: { select: { id: true, ea_persona_name: true } },
          fromTeam: { select: { id: true, name: true } },
          toTeam: { select: { id: true, name: true } },
        },
      });

      await this.notifications.sendToTeamManagers(
        offer.from_team_id,
        '🔄 Contre-proposition du joueur',
        `${updated.player.ea_persona_name ?? 'Le joueur'} propose : indemnité ${formatOc(updated.transfer_fee)}, salaire annuel ${formatOc(updated.offered_salary)}, clause ${formatOc(updated.offered_clause)}.`,
        { offer_id: offerId, type: 'TRANSFER_COUNTER' },
        'info',
        TRANSFER_NOTIF_OPTS,
      );

      return updated;
    }

    // ACCEPT — uniquement quand ce n'est pas votre propre contre-proposition en attente du club
    if (offer.status === 'COUNTER_OFFER') {
      throw new BadRequestException(
        'En attente de la réponse du club acheteur à votre contre-proposition.',
      );
    }

    return this.finalizeTransfer(offerId);
  }

  // ── PATCH /transfers/offer/:id/buyer-respond ─────────────
  async buyerManagerRespond(
    requestingUserId: string,
    offerId: string,
    dto: BuyerRespondOfferDto,
  ) {
    const offer = await this.loadOfferForMutation(offerId);

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        user_id_team_id: { user_id: requestingUserId, team_id: offer.from_team_id },
      },
    });

    if (!membership || !STAFF_ROLES.includes(membership.club_role as (typeof STAFF_ROLES)[number])) {
      throw new ForbiddenException(
        'Seul un dirigeant du club acheteur peut répondre.',
      );
    }

    if (offer.negotiation_turn !== 'BUYING_CLUB') {
      throw new BadRequestException("Ce n'est pas au club acheteur de répondre pour l'instant.");
    }

    if (offer.status !== 'COUNTER_OFFER') {
      throw new BadRequestException('Aucune contre-proposition en attente.');
    }

    if (dto.action === 'REJECT') {
      return this.closeOfferRejected(offer, 'buyer');
    }

    if (dto.action === 'REVISE') {
      await this.assertTransferMarketOpen(
        offer.from_team_id,
        offer.to_team_id,
      );
      const hasChange =
        dto.transfer_fee != null ||
        dto.offered_salary != null ||
        dto.offered_clause != null ||
        dto.duration_months != null;
      if (!hasChange) {
        throw new BadRequestException('Indiquez au moins un champ à ajuster.');
      }
      return this.prisma.transferOffer.update({
        where: { id: offerId },
        data: {
          transfer_fee: dto.transfer_fee ?? offer.transfer_fee,
          offered_salary: dto.offered_salary ?? offer.offered_salary,
          offered_clause: dto.offered_clause ?? offer.offered_clause,
          duration_months: dto.duration_months ?? offer.duration_months,
          status: 'PENDING',
          negotiation_turn: 'PLAYER',
          responded_at: new Date(),
        },
        include: {
          player: { select: { id: true, ea_persona_name: true } },
          fromTeam: { select: { id: true, name: true } },
          toTeam: { select: { id: true, name: true } },
        },
      });
    }

    // ACCEPT_COUNTER — accepter les termes négociés par le joueur
    return this.finalizeTransfer(offerId);
  }

  private async loadOfferForMutation(offerId: string) {
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

    return offer;
  }

  private async closeOfferRejected(
    offer: {
      id: string;
      from_team_id: string;
      to_team_id: string | null;
      player_id: string;
      transfer_fee: number;
      offered_salary: number;
      player: { ea_persona_name: string | null };
      toTeam: { name: string } | null;
      fromTeam: { name: string };
    },
    by: 'player' | 'buyer',
  ) {
    const rejected = await this.prisma.transferOffer.update({
      where: { id: offer.id },
      data: { status: 'REJECTED', responded_at: new Date() },
    });

    const label =
      by === 'player'
        ? `${offer.player.ea_persona_name ?? 'Le joueur'} a refusé l'offre (indemnité prévue ${formatOc(offer.transfer_fee)}).`
        : `${offer.fromTeam.name} a abandonné la négociation (offre à ${formatOc(offer.transfer_fee)} + ${formatOc(offer.offered_salary)}/an).`;

    await this.notifications.sendToTeamManagers(
      offer.from_team_id,
      '❌ Négociation clôturée',
      label,
      {
        offer_id: offer.id,
        type: 'TRANSFER_OFFER_REJECTED',
        player_name: offer.player.ea_persona_name ?? undefined,
      },
      by === 'player' ? 'error' : 'info',
      TRANSFER_NOTIF_OPTS,
    );

    if (by === 'buyer') {
      await this.notifications.sendNotification(
        offer.player_id,
        '❌ Proposition retirée',
        `Le club ${offer.fromTeam.name} a abandonné la négociation (offre : ${formatOc(offer.transfer_fee)} + ${formatOc(offer.offered_salary)}/an).`,
        'info',
        {
          type: 'TRANSFER_OFFER_CANCELLED',
          offer_id: offer.id,
          from_team_name: offer.fromTeam.name,
        },
        TRANSFER_NOTIF_OPTS,
      );
    }

    return rejected;
  }

  /**
   * Exécute le transfert : débit acheteur (frais + 1re année salaire), crédit vendeur (frais),
   * mutation d'effectif et nouveau contrat.
   * Si transfer_fee >= clause libératoire actuelle, le vendeur ne peut pas bloquer (pas d'étape vendeur dans ce flux).
   *
   * Garanties :
   * - Transaction atomique : tout ou rien
   * - Double vérification du budget à l'intérieur de la transaction
   * - Création automatique d'une entrée dans le Journal du Mercato
   */
  private async finalizeTransfer(offerId: string) {
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

    if (offer.status === 'ACCEPTED') {
      throw new BadRequestException('Transfert déjà effectué.');
    }

    await this.assertTransferMarketOpen(offer.from_team_id, offer.to_team_id);

    const currentContract = await this.prisma.contract.findFirst({
      where: {
        user_id: offer.player_id,
        ...(offer.to_team_id != null
          ? { team_id: offer.to_team_id }
          : {}),
        status: 'ACTIVE',
        end_date: { gt: new Date() },
      },
    });

    const releaseClauseMet =
      currentContract != null &&
      offer.transfer_fee >= currentContract.release_clause;

    const totalCost = totalSigningCost(offer.transfer_fee, offer.offered_salary);

    // Atomic transaction avec double-check budget + création NewsEvent
    const result = await this.prisma.$transaction(async (tx) => {
      // 🔒 DOUBLE CHECK: Verrouiller et re-vérifier le budget de l'acheteur dans la transaction
      const buyer = await tx.club.findUnique({
        where: { id: offer.from_team_id },
      });

      if (!buyer) {
        throw new BadRequestException('Club acheteur introuvable.');
      }

      if (buyer.budget < offer.transfer_fee) {
        throw new HttpException(
          {
            message: `Budget club insuffisant pour couvrir les frais de transfert (${formatOc(offer.transfer_fee)}).`,
            code: 'INSUFFICIENT_CLUB_FUNDS',
          },
          400,
        );
      }

      if (buyer.budget < totalCost) {
        throw new HttpException(
          {
            message: `Budget insuffisant pour finaliser le transfert. Requis : ${totalCost.toLocaleString('fr-FR')} OC (frais + première année de salaire), disponible : ${buyer.budget.toLocaleString('fr-FR')} OC.`,
            code: 'INSUFFICIENT_CLUB_FUNDS',
          },
          400,
        );
      }

      // 1. Marquer l'offre comme acceptée
      const accepted = await tx.transferOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED', responded_at: new Date() },
      });

      // 2. Débit club acheteur : indemnité de transfert
      await tx.club.update({
        where: { id: offer.from_team_id },
        data: { budget: { decrement: offer.transfer_fee } },
      });

      // 3. Crédit portefeuille OC personnel du joueur (User.omjepCoins — pas de table UserWallet)
      const signingBonusOc = Math.max(0, Math.round(offer.transfer_fee));
      if (signingBonusOc > 0) {
        await tx.user.update({
          where: { id: offer.player_id },
          data: { omjepCoins: { increment: signingBonusOc } },
        });
      }

      // 4. Écriture comptable : débit frais de transfert côté club acheteur
      await tx.transaction.create({
        data: {
          team_id: offer.from_team_id,
          amount: -offer.transfer_fee,
          type: 'TRANSFER',
          description: `Frais de transfert — ${offer.player.ea_persona_name ?? 'joueur'} (prime OC joueur : ${signingBonusOc.toLocaleString('fr-FR')} OC)`,
        },
      });

      // 5. Débit salaire année 1
      await tx.club.update({
        where: { id: offer.from_team_id },
        data: { budget: { decrement: offer.offered_salary } },
      });

      await tx.transaction.create({
        data: {
          team_id: offer.from_team_id,
          amount: -offer.offered_salary,
          type: 'WAGE',
          description: `Salaire année 1 — ${offer.player.ea_persona_name ?? 'joueur'}`,
        },
      });

      // 6. Créditer le vendeur (indemnité reçue)
      if (offer.to_team_id != null && offer.transfer_fee > 0) {
        await tx.club.update({
          where: { id: offer.to_team_id },
          data: { budget: { increment: offer.transfer_fee } },
        });
      }

      // 7. Journal comptable — crédit vendeur
      if (offer.to_team_id != null && offer.transfer_fee > 0) {
        await tx.transaction.create({
          data: {
            team_id: offer.to_team_id,
            amount: offer.transfer_fee,
            type: 'TRANSFER',
            description: `Vente ${offer.player.ea_persona_name ?? 'joueur'} vers ${offer.fromTeam.name}${releaseClauseMet ? ' (clause libératoire atteinte)' : ''}`,
          },
        });
      }

      // 8. Retirer le joueur de l’ancien club
      if (offer.to_team_id != null) {
        await tx.teamMember.deleteMany({
          where: {
            user_id: offer.player_id,
            team_id: offer.to_team_id,
          },
        });
      } else {
        // Signature libre (to_team_id null) : retirer toute affiliation existante avant l’effectif acheteur
        await tx.teamMember.deleteMany({
          where: { user_id: offer.player_id },
        });
      }

      // 9. Ajouter le joueur au nouveau club
      await tx.teamMember.create({
        data: {
          user_id: offer.player_id,
          team_id: offer.from_team_id,
          club_role: 'PLAYER',
        },
      });

      // 10. Résilier l'ancien contrat
      if (currentContract) {
        await tx.contract.update({
          where: { id: currentContract.id },
          data: { status: 'TERMINATED' },
        });
      }

      // 11. Créer le nouveau contrat
      const start = new Date();
      await tx.contract.create({
        data: {
          user_id: offer.player_id,
          team_id: offer.from_team_id,
          salary: offer.offered_salary,
          release_clause: offer.offered_clause,
          start_date: start,
          end_date: contractEndDate(start, offer.duration_months),
          status: 'ACTIVE',
        },
      });

      // 12. Annuler les autres offres en cours pour ce joueur
      await tx.transferOffer.updateMany({
        where: {
          player_id: offer.player_id,
          status: { in: ['PENDING', 'COUNTER_OFFER'] },
          id: { not: offerId },
        },
        data: { status: 'CANCELLED', responded_at: new Date() },
      });

      // 13. 📰 Fil d’actualité global (News)
      const playerName = offer.player.ea_persona_name ?? 'Joueur';
      const clubName = offer.fromTeam.name;
      const montantStr = offer.transfer_fee.toLocaleString('fr-FR');
      const newsTitle = `OFFICIEL : ${playerName} rejoint ${clubName} pour ${montantStr} OC !`;
      const sellerName = offer.toTeam?.name ?? 'Agent libre';
      const newsDescription =
        offer.to_team_id == null
          ? `${playerName} s'engage avec ${clubName} en tant qu'agent libre.`
          : releaseClauseMet
            ? `${playerName} quitte ${sellerName} et rejoint ${clubName} après activation de la clause libératoire (${montantStr} OC).`
            : `${playerName} s'engage avec ${clubName}. Frais de transfert : ${montantStr} OC.`;

      await tx.newsEvent.create({
        data: {
          type: 'TRANSFER',
          title: newsTitle,
          description: newsDescription,
          metadata: {
            playerId: offer.player_id,
            playerName: offer.player.ea_persona_name,
            fromTeamId: offer.to_team_id,
            fromTeamName: sellerName,
            toTeamId: offer.from_team_id,
            toTeamName: offer.fromTeam.name,
            transferFee: offer.transfer_fee,
            offeredSalary: offer.offered_salary,
            releaseClauseMet: releaseClauseMet,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return accepted;
    }, {
      // Options de transaction pour renforcer l'isolation
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });

    // Notifications (hors transaction - non bloquant pour le transfert)
    await this.notifications.sendToTeamManagers(
      offer.from_team_id,
      '✅ Transfert conclu',
      `${offer.player.ea_persona_name ?? 'Le joueur'} a signé — bienvenue dans l'effectif. Frais ${formatOc(offer.transfer_fee)} + ${formatOc(offer.offered_salary)} de salaire année 1.`,
      { offer_id: offerId, type: 'TRANSFER_OFFER_ACCEPTED' },
      'success',
      TRANSFER_NOTIF_OPTS,
    );

    await this.notifications.sendNotification(
      offer.player_id,
      '🔄 Transfert officialisé',
      `Vous rejoignez ${offer.fromTeam.name}. Indemnité ${formatOc(offer.transfer_fee)}, salaire annuel ${formatOc(offer.offered_salary)}, clause ${formatOc(offer.offered_clause)}.`,
      'success',
      { offer_id: offerId, type: 'PLAYER_TRANSFERRED' },
      TRANSFER_NOTIF_OPTS,
    );

    if (offer.to_team_id != null) {
      await this.notifications.sendToTeamManagers(
        offer.to_team_id,
        releaseClauseMet ? '⚡ Clause libératoire activée' : '💰 Transfert réalisé',
        releaseClauseMet
          ? `${offer.player.ea_persona_name ?? 'Votre joueur'} a été libéré après activation de la clause libératoire (${offer.transfer_fee.toLocaleString('fr-FR')} OC).`
          : `${offer.player.ea_persona_name ?? 'Votre joueur'} a été vendu à ${offer.fromTeam.name} pour ${offer.transfer_fee.toLocaleString('fr-FR')} OC.`,
        { offer_id: offerId, type: 'PLAYER_SOLD' },
        'success',
        TRANSFER_NOTIF_OPTS,
      );
    }

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
        ...(filters?.status && { status: filters.status as TransferOfferStatus }),
      },
      include: {
        player: { select: { id: true, ea_persona_name: true, preferred_position: true } },
        fromTeam: { select: { id: true, name: true, logo_url: true, budget: true } },
        toTeam: { select: { id: true, name: true, logo_url: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 80,
    });
  }

  /** Offres où l'utilisateur est le joueur concerné */
  async listOffersAsPlayer(userId: string) {
    return this.prisma.transferOffer.findMany({
      where: {
        player_id: userId,
        status: { in: ['PENDING', 'COUNTER_OFFER'] },
      },
      include: {
        player: { select: { id: true, ea_persona_name: true, preferred_position: true } },
        fromTeam: { select: { id: true, name: true, logo_url: true, budget: true } },
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

  // ── GET /transfers/free-agents ────────────────────────────
  /**
   * Récupère les agents libres : joueurs sans club OU avec un contrat expiré
   * Ces joueurs peuvent être recrutés sans frais de transfert
   */
  async getFreeAgents(limit = 50, position?: string, excludePendingOffersFromTeamId?: string) {
    const now = new Date();

    let excludePlayerIds: string[] = [];
    if (excludePendingOffersFromTeamId) {
      const pending = await this.prisma.transferOffer.findMany({
        where: {
          from_team_id: excludePendingOffersFromTeamId,
          status: { in: ['PENDING', 'COUNTER_OFFER'] },
        },
        select: { player_id: true },
      });
      excludePlayerIds = [...new Set(pending.map((p) => p.player_id))];
    }

    // Convertir la position string en enum Position si nécessaire
    const positionFilter = position as Position | undefined;

    // Trouver les utilisateurs qui sont des joueurs
    const freeAgents = await this.prisma.user.findMany({
      where: {
        role: 'PLAYER',
        ...(excludePlayerIds.length > 0 && { id: { notIn: excludePlayerIds } }),
        // Soit pas de team membership actif
        OR: [
          {
            teamMemberships: {
              none: {},
            },
          },
          {
            // Soit tous les contrats sont expirés ou résiliés
            contracts: {
              none: {
                status: 'ACTIVE',
                end_date: { gt: now },
              },
            },
          },
        ],
        // Filtrer par position si spécifié
        ...(positionFilter && { preferred_position: positionFilter }),
      },
      select: {
        id: true,
        ea_persona_name: true,
        preferred_position: true,
        stats: {
          select: {
            matches_played: true,
            goals: true,
            assists: true,
            average_rating: true,
          },
        },
      },
      orderBy: { ea_persona_name: 'asc' },
      take: limit,
    });

    return freeAgents.map((agent) => ({
      id: agent.id,
      name: agent.ea_persona_name ?? 'Sans nom',
      position: agent.preferred_position ?? 'Non spécifié',
      stats: agent.stats ?? {
        matches_played: 0,
        goals: 0,
        assists: 0,
        average_rating: 0,
      },
      isFreeAgent: true,
      transferFee: 0, // Pas de frais de transfert
    }));
  }
}
