import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTransferOfferDto } from './dto/create-transfer-offer.dto';
import { PlayerRespondOfferDto } from './dto/player-respond-offer.dto';
import { BuyerRespondOfferDto } from './dto/buyer-respond-offer.dto';
import type { TransferOfferStatus, Position } from '@omjep/shared';
import { ClubWalletService, type PrismaTx } from './club-wallet.service';

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
  private static readonly OFFER_TTL_MS = 48 * 60 * 60 * 1000

  /** Tolérance OC entre `reserved_amount` et frais+salaire au moment de l’acceptation. */
  private static readonly RESERVE_ALIGN_EPS = 0.5

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly clubWallet: ClubWalletService,
  ) {}

  /** Avant la mi-saison calendaire de la saison courante : une seule offre active (PENDING/COUNTER) par joueur, tous clubs confondus. */
  private async shouldRestrictSingleActiveOfferPerPlayer(): Promise<boolean> {
    const season = await this.prisma.season.findFirst({
      where: { is_current: true },
    })
    if (!season) return true
    const now = Date.now()
    const start = season.start_date.getTime()
    const end = season.end_date.getTime()
    if (!(end > start)) return true
    const mid = start + (end - start) / 2
    return now < mid
  }

  private static reservedMatchesSigning(
    reserved: number | null | undefined,
    totalCost: number,
  ): boolean {
    return Math.abs(Number(reserved ?? 0) - totalCost) <= TransferOfferService.RESERVE_ALIGN_EPS
  }

  /** Contrat actif joueur (une équipe), s’il existe. */
  private async findPlayerActiveContract(playerId: string) {
    return this.prisma.contract.findFirst({
      where: {
        user_id: playerId,
        status: 'ACTIVE',
        end_date: { gt: new Date() },
      },
    })
  }

  /**
   * Agent libre : NEGOTIATED_FEE + `to_team_id` null.
   * Sous contrat : RELEASE_CLAUSE_BUYOUT + vendeur = club du contrat + `transfer_fee` ≥ clause.
   */
  private validateMercatoOfferAgainstContractState(
    activeContract: { team_id: string; release_clause: number } | null,
    transferMode: string,
    toTeamId: string | null,
    fromTeamId: string,
    transferFee: number,
  ): void {
    if (!activeContract) {
      if (transferMode === 'RELEASE_CLAUSE_BUYOUT') {
        throw new BadRequestException(
          "Ce joueur est libre : la clause libératoire n'est pas applicable.",
        )
      }
      if (toTeamId != null) {
        throw new BadRequestException(
          "Ce joueur est libre : l'offre ne doit pas inclure de club vendeur.",
        )
      }
      return
    }
    if (transferMode !== 'RELEASE_CLAUSE_BUYOUT') {
      throw new BadRequestException(
        'Ce joueur est sous contrat : seule la clause libératoire peut être activée.',
      )
    }
    if (toTeamId !== activeContract.team_id) {
      throw new BadRequestException(
        'Le club vendeur ne correspond pas au club actuel du joueur.',
      )
    }
    if (fromTeamId === toTeamId) {
      throw new BadRequestException('Impossible de transférer vers le même club.')
    }
    if (!Number.isFinite(transferFee) || transferFee < activeContract.release_clause) {
      throw new BadRequestException(
        'Le montant proposé est inférieur à la clause libératoire.',
      )
    }
  }

  private async tryMarkOfferExpiredIfStale(offerId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.transferOffer.findFirst({
        where: {
          id: offerId,
          status: { in: ['PENDING', 'COUNTER_OFFER'] },
          expires_at: { not: null, lt: new Date() },
        },
      })
      if (!fresh) return
      const r = Number(fresh.reserved_amount ?? 0)
      if (r > 0) {
        await this.clubWallet.releaseInTransaction(
          tx,
          fresh.from_team_id,
          r,
          'Expiration offre mercato (48h)',
          { offer_id: fresh.id },
        )
      }
      await tx.transferOffer.update({
        where: { id: offerId },
        data: { status: 'EXPIRED', responded_at: new Date() },
      })
    })
  }

  private async adjustOfferReservationInTx(
    tx: PrismaTx,
    fromTeamId: string,
    oldReserved: number,
    newRequired: number,
    reason: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    const o = Number(oldReserved) || 0
    const n = Number(newRequired) || 0
    if (Math.abs(o - n) < TransferOfferService.RESERVE_ALIGN_EPS) return
    if (n > o) {
      await this.clubWallet.reserveInTransaction(tx, fromTeamId, n - o, reason, meta)
    } else {
      await this.clubWallet.releaseInTransaction(tx, fromTeamId, o - n, reason, meta)
    }
  }

  /**
   * Phase D : marché ouvert si le club n’est dans aucune compétition ONGOING au mercato fermé.
   * Aucune inscription en compétition ONGOING → autorisé.
   */
  private async teamTransferPeriodAllows(teamId: string): Promise<boolean> {
    const blocked = await this.prisma.competitionTeam.findFirst({
      where: {
        team_id: teamId,
        competition: {
          status: 'ONGOING',
          isTransferMarketOpen: false,
        },
      },
    })
    return blocked === null
  }

  private async assertTransferMarketOpen(
    fromTeamId: string,
    toTeamId: string | null,
  ) {
    const msg = 'La période de transfert est fermée.'
    if (!(await this.teamTransferPeriodAllows(fromTeamId))) {
      throw new ForbiddenException(msg)
    }
    if (toTeamId != null && !(await this.teamTransferPeriodAllows(toTeamId))) {
      throw new ForbiddenException(msg)
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
        competition: {
          status: 'ONGOING',
          isTransferMarketOpen: false,
        },
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
    const actorUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true },
    })
    if (!actorUser) {
      throw new NotFoundException('Utilisateur introuvable.')
    }

    const buyingTeam = await this.prisma.club.findUnique({
      where: { id: dto.from_team_id },
    })

    if (!buyingTeam) {
      throw new NotFoundException('Club acheteur introuvable.')
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        user_id_team_id: { user_id: requestingUserId, team_id: dto.from_team_id },
      },
    })

    const staffOk =
      membership !== null &&
      STAFF_ROLES.includes(membership.club_role as (typeof STAFF_ROLES)[number])
    const managerLinkOk =
      actorUser.role === 'MANAGER' && buyingTeam.manager_id === requestingUserId
    const isAdmin = actorUser.role === 'ADMIN'

    if (!isAdmin && !staffOk && !managerLinkOk) {
      throw new ForbiddenException(
        'Seuls les dirigeants du club (Founder, Manager, Co-manager) peuvent initier une offre mercato. Les joueurs peuvent uniquement répondre aux offres reçues.',
      )
    }

    const toTeamId =
      dto.to_team_id === undefined || dto.to_team_id === null || dto.to_team_id === ''
        ? null
        : dto.to_team_id;

    const transferMode = dto.transfer_mode ?? 'NEGOTIATED_FEE'

    const activeContractForPlayer = await this.findPlayerActiveContract(dto.player_id)
    this.validateMercatoOfferAgainstContractState(
      activeContractForPlayer,
      transferMode,
      toTeamId,
      dto.from_team_id,
      dto.transfer_fee,
    )

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

    const requiredAmount = totalSigningCost(dto.transfer_fee, salaryAnnual)
    const wallet = await this.clubWallet.getWallet(dto.from_team_id)
    if (!wallet) {
      throw new BadRequestException(
        'Portefeuille club introuvable : impossible de réserver les fonds pour cette offre.',
      )
    }
    const available = ClubWalletService.computeAvailable(wallet)
    if (available < requiredAmount) {
      throw new BadRequestException(
        `Budget disponible insuffisant (wallet club). Requis : ${formatOc(requiredAmount)}, disponible : ${formatOc(available)}.`,
      )
    }

    const restrictGlobal = await this.shouldRestrictSingleActiveOfferPerPlayer()
    const activeOfferStatuses: TransferOfferStatus[] = ['PENDING', 'COUNTER_OFFER']
    const duplicateWhere = restrictGlobal
      ? {
          player_id: dto.player_id,
          status: { in: activeOfferStatuses },
        }
      : {
          player_id: dto.player_id,
          from_team_id: dto.from_team_id,
          status: { in: activeOfferStatuses },
        }

    const existingOffer = await this.prisma.transferOffer.findFirst({
      where: duplicateWhere,
    })

    if (existingOffer) {
      throw new BadRequestException(
        restrictGlobal
          ? "Une offre active existe déjà pour ce joueur (limite avant mi-saison : une seule négociation à la fois)."
          : 'Une négociation en cours existe déjà pour ce joueur de votre part.',
      )
    }

    const seasonsCountResolved =
      dto.seasons_count ?? Math.max(1, Math.round(dto.duration_months / 6))

    let contractStartSeasonId: string | null = null
    if (dto.contract_start_season_id) {
      const s = await this.prisma.season.findUnique({
        where: { id: dto.contract_start_season_id },
      })
      if (!s) {
        throw new BadRequestException('Saison de début du contrat introuvable.')
      }
      contractStartSeasonId = s.id
    } else {
      const current = await this.prisma.season.findFirst({
        where: { is_current: true },
      })
      contractStartSeasonId = current?.id ?? null
    }

    await this.assertTransferMarketOpen(dto.from_team_id, toTeamId);

    const expiresAt = new Date(Date.now() + TransferOfferService.OFFER_TTL_MS)

    const offer = await this.prisma.$transaction(
      async (tx) => {
        const dupInTx = await tx.transferOffer.findFirst({ where: duplicateWhere })
        if (dupInTx) {
          throw new BadRequestException(
            restrictGlobal
              ? "Une offre active existe déjà pour ce joueur (limite avant mi-saison : une seule négociation à la fois)."
              : 'Une négociation en cours existe déjà pour ce joueur de votre part.',
          )
        }

        await this.clubWallet.reserveInTransaction(
          tx,
          dto.from_team_id,
          requiredAmount,
          'Création offre de transfert — réserve frais + salaire année 1',
          { player_id: dto.player_id, action: 'create_offer' },
        )

        return tx.transferOffer.create({
          data: {
            player_id: dto.player_id,
            from_team_id: dto.from_team_id,
            to_team_id: toTeamId,
            transfer_fee: dto.transfer_fee,
            transfer_mode: transferMode,
            offered_salary: salaryAnnual,
            offered_clause: clauseVal,
            duration_months: dto.duration_months,
            status: 'PENDING',
            negotiation_turn: 'PLAYER',
            reserved_amount: requiredAmount,
            expires_at: expiresAt,
            seasons_count: seasonsCountResolved,
            contract_start_season_id: contractStartSeasonId,
          },
          include: {
            player: { select: { id: true, ea_persona_name: true } },
            fromTeam: { select: { id: true, name: true } },
            toTeam: { select: { id: true, name: true } },
          },
        })
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      },
    )

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

    if (offer.status === 'EXPIRED') {
      throw new BadRequestException('Cette offre a expiré.')
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
      const nextFee = dto.transfer_fee ?? offer.transfer_fee
      const nextSalary = dto.offered_salary ?? offer.offered_salary
      const nextClause = dto.offered_clause ?? offer.offered_clause
      const newRequired = totalSigningCost(nextFee, nextSalary)
      const oldReserved = Number(offer.reserved_amount ?? 0)
      const nextExpires = new Date(Date.now() + TransferOfferService.OFFER_TTL_MS)

      const contractAtCounter = await this.findPlayerActiveContract(offer.player_id)
      this.validateMercatoOfferAgainstContractState(
        contractAtCounter,
        offer.transfer_mode,
        offer.to_team_id,
        offer.from_team_id,
        nextFee,
      )

      const updated = await this.prisma.$transaction(
        async (tx) => {
          await this.adjustOfferReservationInTx(
            tx,
            offer.from_team_id,
            oldReserved,
            newRequired,
            'Ajustement réserve — contre-proposition joueur',
            { offer_id: offerId },
          )
          return tx.transferOffer.update({
            where: { id: offerId },
            data: {
              transfer_fee: nextFee,
              offered_salary: nextSalary,
              offered_clause: nextClause,
              reserved_amount: newRequired,
              status: 'COUNTER_OFFER',
              negotiation_turn: 'BUYING_CLUB',
              responded_at: new Date(),
              expires_at: nextExpires,
            },
            include: {
              player: { select: { id: true, ea_persona_name: true } },
              fromTeam: { select: { id: true, name: true } },
              toTeam: { select: { id: true, name: true } },
            },
          })
        },
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        },
      )

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

    if (offer.status === 'EXPIRED') {
      throw new BadRequestException('Cette offre a expiré.')
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
      const nextFee = dto.transfer_fee ?? offer.transfer_fee
      const nextSalary = dto.offered_salary ?? offer.offered_salary
      const nextClause = dto.offered_clause ?? offer.offered_clause
      const nextDuration = dto.duration_months ?? offer.duration_months
      const newRequired = totalSigningCost(nextFee, nextSalary)
      const oldReserved = Number(offer.reserved_amount ?? 0)
      const nextExpires = new Date(Date.now() + TransferOfferService.OFFER_TTL_MS)

      const contractAtRevise = await this.findPlayerActiveContract(offer.player_id)
      this.validateMercatoOfferAgainstContractState(
        contractAtRevise,
        offer.transfer_mode,
        offer.to_team_id,
        offer.from_team_id,
        nextFee,
      )

      return this.prisma.$transaction(
        async (tx) => {
          await this.adjustOfferReservationInTx(
            tx,
            offer.from_team_id,
            oldReserved,
            newRequired,
            'Ajustement réserve — révision club acheteur',
            { offer_id: offerId },
          )
          return tx.transferOffer.update({
            where: { id: offerId },
            data: {
              transfer_fee: nextFee,
              offered_salary: nextSalary,
              offered_clause: nextClause,
              duration_months: nextDuration,
              reserved_amount: newRequired,
              status: 'PENDING',
              negotiation_turn: 'PLAYER',
              responded_at: new Date(),
              expires_at: nextExpires,
            },
            include: {
              player: { select: { id: true, ea_persona_name: true } },
              fromTeam: { select: { id: true, name: true } },
              toTeam: { select: { id: true, name: true } },
            },
          })
        },
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        },
      )
    }

    // ACCEPT_COUNTER — accepter les termes négociés par le joueur
    return this.finalizeTransfer(offerId);
  }

  private async loadOfferForMutation(offerId: string) {
    await this.tryMarkOfferExpiredIfStale(offerId)
    const offer = await this.prisma.transferOffer.findUnique({
      where: { id: offerId },
      include: {
        player: { select: { id: true, ea_persona_name: true } },
        fromTeam: { select: { id: true, name: true, budget: true } },
        toTeam: { select: { id: true, name: true } },
      },
    })

    if (!offer) {
      throw new NotFoundException('Offre introuvable.')
    }

    return offer
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
    const latest = await this.prisma.transferOffer.findUnique({
      where: { id: offer.id },
      include: {
        player: { select: { id: true, ea_persona_name: true } },
        fromTeam: { select: { id: true, name: true } },
        toTeam: { select: { id: true, name: true } },
      },
    })
    if (!latest) {
      throw new NotFoundException('Offre introuvable.')
    }
    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(latest.status)) {
      return latest
    }
    if (latest.status === 'ACCEPTED') {
      throw new BadRequestException('Transfert déjà accepté.')
    }

    const reserved = Number(latest.reserved_amount ?? 0)

    const rejected = await this.prisma.$transaction(async (tx) => {
      const u = await tx.transferOffer.updateMany({
        where: {
          id: latest.id,
          status: { in: ['PENDING', 'COUNTER_OFFER'] },
        },
        data: { status: 'REJECTED', responded_at: new Date() },
      })
      if (u.count === 0) {
        const again = await tx.transferOffer.findUnique({
          where: { id: latest.id },
          include: {
            player: { select: { id: true, ea_persona_name: true } },
            fromTeam: { select: { id: true, name: true } },
            toTeam: { select: { id: true, name: true } },
          },
        })
        if (again && ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(again.status)) {
          return again
        }
        throw new BadRequestException('Cette offre ne peut plus être refusée.')
      }
      if (reserved > 0) {
        await this.clubWallet.releaseInTransaction(
          tx,
          latest.from_team_id,
          reserved,
          by === 'player'
            ? 'Refus joueur — libération réserve mercato'
            : 'Abandon club acheteur — libération réserve mercato',
          { offer_id: latest.id },
        )
      }
      return tx.transferOffer.findUniqueOrThrow({
        where: { id: latest.id },
        include: {
          player: { select: { id: true, ea_persona_name: true } },
          fromTeam: { select: { id: true, name: true } },
          toTeam: { select: { id: true, name: true } },
        },
      })
    })

    const label =
      by === 'player'
        ? `${rejected.player.ea_persona_name ?? 'Le joueur'} a refusé l'offre (indemnité prévue ${formatOc(rejected.transfer_fee)}).`
        : `${rejected.fromTeam.name} a abandonné la négociation (offre à ${formatOc(rejected.transfer_fee)} + ${formatOc(rejected.offered_salary)}/an).`

    await this.notifications.sendToTeamManagers(
      rejected.from_team_id,
      '❌ Négociation clôturée',
      label,
      {
        offer_id: rejected.id,
        type: 'TRANSFER_OFFER_REJECTED',
        player_name: rejected.player.ea_persona_name ?? undefined,
      },
      by === 'player' ? 'error' : 'info',
      TRANSFER_NOTIF_OPTS,
    )

    if (by === 'buyer') {
      await this.notifications.sendNotification(
        rejected.player_id,
        '❌ Proposition retirée',
        `Le club ${rejected.fromTeam.name} a abandonné la négociation (offre : ${formatOc(rejected.transfer_fee)} + ${formatOc(rejected.offered_salary)}/an).`,
        'info',
        {
          type: 'TRANSFER_OFFER_CANCELLED',
          offer_id: rejected.id,
          from_team_name: rejected.fromTeam.name,
        },
        TRANSFER_NOTIF_OPTS,
      )
    }

    return rejected
  }

  /**
   * Exécute le transfert : consommation réserve wallet acheteur (frais + salaire année 1),
   * prime joueur (SIGNING_BONUS), vendeur selon `transfer_mode` (settlement différé vs crédit immédiat),
   * mutation d’effectif, contrat.
   */
  private async finalizeTransfer(offerId: string) {
    const offerInclude = {
      player: { select: { id: true, ea_persona_name: true } },
      fromTeam: { select: { id: true, name: true, budget: true } },
      toTeam: { select: { id: true, name: true } },
    }

    await this.tryMarkOfferExpiredIfStale(offerId)
    const offer = await this.prisma.transferOffer.findUnique({
      where: { id: offerId },
      include: offerInclude,
    })

    if (!offer) {
      throw new NotFoundException('Offre introuvable.')
    }

    if (offer.status === 'ACCEPTED') {
      return this.prisma.transferOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: offerInclude,
      })
    }

    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(offer.status)) {
      throw new BadRequestException('Cette offre ne peut plus être acceptée.')
    }

    if (offer.expires_at && offer.expires_at <= new Date()) {
      await this.tryMarkOfferExpiredIfStale(offerId)
      throw new BadRequestException('Cette offre a expiré.')
    }

    await this.assertTransferMarketOpen(offer.from_team_id, offer.to_team_id)

    const currentContract = await this.findPlayerActiveContract(offer.player_id)
    this.validateMercatoOfferAgainstContractState(
      currentContract,
      offer.transfer_mode,
      offer.to_team_id,
      offer.from_team_id,
      offer.transfer_fee,
    )

    const releaseClauseMet =
      currentContract != null &&
      offer.transfer_fee >= currentContract.release_clause

    const isReleaseClauseMode = offer.transfer_mode === 'RELEASE_CLAUSE_BUYOUT'

    const totalCost = totalSigningCost(offer.transfer_fee, offer.offered_salary)
    const reservedAmount = Number(offer.reserved_amount ?? 0)
    if (!TransferOfferService.reservedMatchesSigning(reservedAmount, totalCost)) {
      throw new BadRequestException(
        'Incohérence entre la réserve du club et le montant de l’offre : mettez à jour la négociation ou recréez une offre.',
      )
    }

    type TxOutcome = { kind: 'done' } | { kind: 'already_accepted' }

    const txOutcome = await this.prisma.$transaction(async (tx): Promise<TxOutcome> => {
      const cur = await tx.transferOffer.findUnique({ where: { id: offerId } })
      if (!cur) {
        throw new NotFoundException('Offre introuvable.')
      }
      if (cur.status === 'ACCEPTED') {
        return { kind: 'already_accepted' }
      }
      if (!['PENDING', 'COUNTER_OFFER'].includes(cur.status)) {
        throw new BadRequestException('Cette offre ne peut plus être acceptée.')
      }
      if (cur.expires_at && cur.expires_at <= new Date()) {
        throw new BadRequestException('Cette offre a expiré.')
      }

      const u = await tx.transferOffer.updateMany({
        where: {
          id: offerId,
          status: { in: ['PENDING', 'COUNTER_OFFER'] },
        },
        data: { status: 'ACCEPTED', responded_at: new Date() },
      })
      if (u.count === 0) {
        const again = await tx.transferOffer.findUnique({ where: { id: offerId } })
        if (again?.status === 'ACCEPTED') {
          return { kind: 'already_accepted' }
        }
        throw new BadRequestException('Cette offre ne peut plus être acceptée.')
      }

      const consumeAmount = Number(cur.reserved_amount ?? 0)
      await this.clubWallet.consumeReservedInTransaction(
        tx,
        cur.from_team_id,
        consumeAmount,
        'Acceptation offre — règlement frais + salaire année 1',
        { offer_id: offerId, player_id: cur.player_id },
      )

      await tx.club.update({
        where: { id: cur.from_team_id },
        data: { budget: { decrement: consumeAmount } },
      })

      const signingBonusOc = Math.round(Number(cur.offered_salary))
      if (signingBonusOc > 0) {
        await tx.user.update({
          where: { id: cur.player_id },
          data: { omjepCoins: { increment: signingBonusOc } },
        })
        await tx.transaction.create({
          data: {
            user_id: cur.player_id,
            amount: signingBonusOc,
            type: 'SIGNING_BONUS',
            description: `Prime de signature mercato (offre ${offerId})`,
          },
        })
      }

      if (cur.to_team_id != null && cur.transfer_fee > 0) {
        if (cur.transfer_mode === 'RELEASE_CLAUSE_BUYOUT') {
          await this.clubWallet.creditClubOmjepInTransaction(
            tx,
            cur.to_team_id,
            cur.transfer_fee,
            'TRANSFER',
            `Paiement clause libératoire — ${offer.player.ea_persona_name ?? 'joueur'} vers ${offer.fromTeam.name}`,
            { offer_id: offerId },
          )
        } else {
          const existingSettlement = await tx.transferSellerSettlement.findUnique({
            where: { transfer_offer_id: offerId },
          })
          if (!existingSettlement) {
            await tx.transferSellerSettlement.create({
              data: {
                transfer_offer_id: offerId,
                seller_team_id: cur.to_team_id,
                amount: cur.transfer_fee,
                status: 'PENDING_SEASON_END',
                season_id: cur.contract_start_season_id,
              },
            })
          }
        }
      }

      if (cur.to_team_id != null) {
        await tx.teamMember.deleteMany({
          where: {
            user_id: cur.player_id,
            team_id: cur.to_team_id,
          },
        })
      } else {
        await tx.teamMember.deleteMany({
          where: { user_id: cur.player_id },
        })
      }

      await tx.teamMember.create({
        data: {
          user_id: cur.player_id,
          team_id: cur.from_team_id,
          club_role: 'PLAYER',
        },
      })

      if (currentContract) {
        await tx.contract.update({
          where: { id: currentContract.id },
          data: { status: 'TERMINATED' },
        })
      }

      const start = new Date()
      await tx.contract.create({
        data: {
          user_id: cur.player_id,
          team_id: cur.from_team_id,
          salary: cur.offered_salary,
          release_clause: cur.offered_clause,
          seasons_count: cur.seasons_count,
          start_season_id: cur.contract_start_season_id,
          start_date: start,
          end_date: contractEndDate(start, cur.duration_months),
          status: 'ACTIVE',
        },
      })

      const others = await tx.transferOffer.findMany({
        where: {
          player_id: cur.player_id,
          status: { in: ['PENDING', 'COUNTER_OFFER'] },
          id: { not: offerId },
        },
      })
      for (const o of others) {
        const r = Number(o.reserved_amount ?? 0)
        if (r > 0) {
          await this.clubWallet.releaseInTransaction(
            tx,
            o.from_team_id,
            r,
            'Annulation offre concurrente (acceptation autre offre)',
            { offer_id: o.id },
          )
        }
      }
      await tx.transferOffer.updateMany({
        where: {
          player_id: cur.player_id,
          status: { in: ['PENDING', 'COUNTER_OFFER'] },
          id: { not: offerId },
        },
        data: { status: 'CANCELLED', responded_at: new Date() },
      })

      const playerName = offer.player.ea_persona_name ?? 'Joueur'
      const clubName = offer.fromTeam.name
      const montantStr = offer.transfer_fee.toLocaleString('fr-FR')
      const newsTitle = `OFFICIEL : ${playerName} rejoint ${clubName} pour ${montantStr} OC !`
      const sellerName = offer.toTeam?.name ?? 'Agent libre'
      const newsDescription =
        offer.to_team_id == null
          ? `${playerName} s'engage avec ${clubName} en tant qu'agent libre.`
          : isReleaseClauseMode
            ? `${playerName} quitte ${sellerName} et rejoint ${clubName} (paiement clause ${montantStr} OC).`
            : releaseClauseMet
              ? `${playerName} quitte ${sellerName} et rejoint ${clubName} (offre ≥ clause : ${montantStr} OC, règlement vendeur fin de saison).`
              : `${playerName} s'engage avec ${clubName}. Frais de transfert : ${montantStr} OC (règlement vendeur fin de saison).`

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
            transferMode: offer.transfer_mode,
            timestamp: new Date().toISOString(),
          },
        },
      })

      return { kind: 'done' }
    }, {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    })

    const finalOffer = await this.prisma.transferOffer.findUniqueOrThrow({
      where: { id: offerId },
      include: offerInclude,
    })

    if (txOutcome.kind === 'already_accepted') {
      return finalOffer
    }

    await this.notifications.sendToTeamManagers(
      finalOffer.from_team_id,
      '✅ Transfert conclu',
      `${finalOffer.player.ea_persona_name ?? 'Le joueur'} a signé — bienvenue dans l'effectif. Frais ${formatOc(finalOffer.transfer_fee)} + ${formatOc(finalOffer.offered_salary)} de salaire année 1.`,
      { offer_id: offerId, type: 'TRANSFER_OFFER_ACCEPTED' },
      'success',
      TRANSFER_NOTIF_OPTS,
    )

    await this.notifications.sendNotification(
      finalOffer.player_id,
      '🔄 Transfert officialisé',
      `Vous rejoignez ${finalOffer.fromTeam.name}. Indemnité ${formatOc(finalOffer.transfer_fee)}, salaire annuel ${formatOc(finalOffer.offered_salary)}, clause ${formatOc(finalOffer.offered_clause)}.`,
      'success',
      { offer_id: offerId, type: 'PLAYER_TRANSFERRED' },
      TRANSFER_NOTIF_OPTS,
    )

    if (finalOffer.to_team_id != null) {
      const releaseMode = finalOffer.transfer_mode === 'RELEASE_CLAUSE_BUYOUT'
      await this.notifications.sendToTeamManagers(
        finalOffer.to_team_id,
        releaseMode ? '⚡ Clause libératoire (paiement reçu)' : '💰 Transfert conclu',
        releaseMode
          ? `${finalOffer.player.ea_persona_name ?? 'Votre joueur'} : paiement clause ${finalOffer.transfer_fee.toLocaleString('fr-FR')} OC crédité sur le wallet club.`
          : `${finalOffer.player.ea_persona_name ?? 'Votre joueur'} a été vendu à ${finalOffer.fromTeam.name} (${finalOffer.transfer_fee.toLocaleString('fr-FR')} OC — règlement fin de saison).`,
        { offer_id: offerId, type: 'PLAYER_SOLD' },
        'success',
        TRANSFER_NOTIF_OPTS,
      )
    }

    return finalOffer
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
