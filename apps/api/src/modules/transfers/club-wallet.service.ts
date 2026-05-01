import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { Prisma, type ClubWallet, type TransactionType } from '@omjep/database';

/** Client Prisma passé à `prisma.$transaction(callback)` — opérations atomiques avec le flux métier. */
export type PrismaTx = Prisma.TransactionClient

/** Max length for `transactions.description` (Prisma default String). */
const MAX_DESCRIPTION_LEN = 2000

const trimDescription = (text: string): string => {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  return `${text.slice(0, MAX_DESCRIPTION_LEN - 1)}…`
}

const formatLedgerDescription = (
  reason: string,
  meta?: Record<string, unknown>,
): string => {
  const base = reason.trim() || 'Mercato club wallet'
  if (!meta || Object.keys(meta).length === 0) return trimDescription(base)
  try {
    const suffix = JSON.stringify(meta)
    return trimDescription(`${base} | meta=${suffix}`)
  } catch {
    return trimDescription(base)
  }
}

const assertPositiveFiniteAmount = (amount: number, label: string): void => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException(`${label} : montant invalide (attendu > 0).`)
  }
}

@Injectable()
export class ClubWalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(teamId: string): Promise<ClubWallet | null> {
    return this.prisma.clubWallet.findUnique({
      where: { team_id: teamId },
    })
  }

  /**
   * Disponible = `omjep_coins_balance - reserved_amount` (hors `season_transfer_budget`).
   */
  async getAvailableBalance(teamId: string): Promise<number> {
    const wallet = await this.requireWallet(teamId)
    return ClubWalletService.computeAvailable(wallet)
  }

  static computeAvailable(wallet: Pick<ClubWallet, 'omjep_coins_balance' | 'reserved_amount'>): number {
    return wallet.omjep_coins_balance - wallet.reserved_amount
  }

  /**
   * Réserve des OC : augmente `reserved_amount` si disponible suffisant.
   * Écriture ledger `TRANSFER_RESERVE` : `amount` positif = montant réservé (audit, sans débit de solde).
   */
  async reserve(
    teamId: string,
    amount: number,
    reason: string,
    meta?: Record<string, unknown>,
  ): Promise<ClubWallet> {
    assertPositiveFiniteAmount(amount, 'Réserve')
    return this.prisma.$transaction(async (tx) =>
      this.reserveInTransaction(tx, teamId, amount, reason, meta),
    )
  }

  /** Même logique que {@link reserve}, dans une transaction Prisma existante (ex. création d’offre). */
  async reserveInTransaction(
    tx: PrismaTx,
    teamId: string,
    amount: number,
    reason: string,
    meta?: Record<string, unknown>,
  ): Promise<ClubWallet> {
    assertPositiveFiniteAmount(amount, 'Réserve')
    const affected = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "club_wallets"
        SET "reserved_amount" = "reserved_amount" + ${amount},
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "team_id" = ${teamId}::uuid
          AND ("omjep_coins_balance" - "reserved_amount") >= ${amount}
      `,
    )
    if (affected !== 1) {
      const w = await tx.clubWallet.findUnique({ where: { team_id: teamId } })
      if (!w) {
        throw new NotFoundException('Portefeuille club introuvable pour cette équipe.')
      }
      throw new BadRequestException(
        'Fonds insuffisants pour réserver ce montant (disponible insuffisant).',
      )
    }
    const wallet = await tx.clubWallet.findUniqueOrThrow({
      where: { team_id: teamId },
    })
    await tx.transaction.create({
      data: {
        team_id: teamId,
        amount,
        type: 'TRANSFER_RESERVE',
        description: formatLedgerDescription(reason, meta),
      },
    })
    return wallet
  }

  /**
   * Libère une partie des réserves : diminue `reserved_amount` (le solde OC ne bouge pas).
   * Ledger `TRANSFER_RELEASE` : `amount` positif = montant libéré (audit).
   */
  async release(
    teamId: string,
    amount: number,
    reason: string,
    meta?: Record<string, unknown>,
  ): Promise<ClubWallet> {
    assertPositiveFiniteAmount(amount, 'Libération')
    return this.prisma.$transaction(async (tx) =>
      this.releaseInTransaction(tx, teamId, amount, reason, meta),
    )
  }

  async releaseInTransaction(
    tx: PrismaTx,
    teamId: string,
    amount: number,
    reason: string,
    meta?: Record<string, unknown>,
  ): Promise<ClubWallet> {
    assertPositiveFiniteAmount(amount, 'Libération')
    const affected = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "club_wallets"
        SET "reserved_amount" = "reserved_amount" - ${amount},
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "team_id" = ${teamId}::uuid
          AND "reserved_amount" >= ${amount}
      `,
    )
    if (affected !== 1) {
      const w = await tx.clubWallet.findUnique({ where: { team_id: teamId } })
      if (!w) {
        throw new NotFoundException('Portefeuille club introuvable pour cette équipe.')
      }
      throw new BadRequestException(
        'Impossible de libérer ce montant (réserves insuffisantes).',
      )
    }
    const wallet = await tx.clubWallet.findUniqueOrThrow({
      where: { team_id: teamId },
    })
    await tx.transaction.create({
      data: {
        team_id: teamId,
        amount,
        type: 'TRANSFER_RELEASE',
        description: formatLedgerDescription(reason, meta),
      },
    })
    return wallet
  }

  /**
   * Consomme des OC réservés : diminue `reserved_amount` et `omjep_coins_balance`.
   * Ledger `TRANSFER_SETTLEMENT` : `amount` négatif = débit réel du solde club.
   */
  async consumeReserved(
    teamId: string,
    amount: number,
    reason: string,
    meta?: Record<string, unknown>,
  ): Promise<ClubWallet> {
    assertPositiveFiniteAmount(amount, 'Règlement')
    return this.prisma.$transaction(async (tx) =>
      this.consumeReservedInTransaction(tx, teamId, amount, reason, meta),
    )
  }

  async consumeReservedInTransaction(
    tx: PrismaTx,
    teamId: string,
    amount: number,
    reason: string,
    meta?: Record<string, unknown>,
  ): Promise<ClubWallet> {
    assertPositiveFiniteAmount(amount, 'Règlement')
    const affected = await tx.$executeRaw(
      Prisma.sql`
        UPDATE "club_wallets"
        SET "reserved_amount" = "reserved_amount" - ${amount},
            "omjep_coins_balance" = "omjep_coins_balance" - ${amount},
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "team_id" = ${teamId}::uuid
          AND "reserved_amount" >= ${amount}
          AND "omjep_coins_balance" >= ${amount}
      `,
    )
    if (affected !== 1) {
      const w = await tx.clubWallet.findUnique({ where: { team_id: teamId } })
      if (!w) {
        throw new NotFoundException('Portefeuille club introuvable pour cette équipe.')
      }
      throw new BadRequestException(
        'Impossible de régler ce montant (réserves ou solde insuffisant).',
      )
    }
    const wallet = await tx.clubWallet.findUniqueOrThrow({
      where: { team_id: teamId },
    })
    await tx.transaction.create({
      data: {
        team_id: teamId,
        amount: -amount,
        type: 'TRANSFER_SETTLEMENT',
        description: formatLedgerDescription(reason, meta),
      },
    })
    return wallet
  }

  /**
   * Crédit solde club (wallet + `clubs.budget` + ligne `transactions`) — ex. indemnité reçue par le vendeur.
   */
  async creditClubOmjepInTransaction(
    tx: PrismaTx,
    teamId: string,
    amount: number,
    ledgerType: TransactionType,
    reason: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    assertPositiveFiniteAmount(amount, 'Crédit club')
    const wCount = await tx.clubWallet.updateMany({
      where: { team_id: teamId },
      data: { omjep_coins_balance: { increment: amount } },
    })
    if (wCount.count !== 1) {
      throw new NotFoundException('Portefeuille club introuvable pour cette équipe.')
    }
    await tx.club.update({
      where: { id: teamId },
      data: { budget: { increment: amount } },
    })
    await tx.transaction.create({
      data: {
        team_id: teamId,
        amount,
        type: ledgerType,
        description: formatLedgerDescription(reason, meta),
      },
    })
  }

  private async requireWallet(teamId: string): Promise<ClubWallet> {
    const wallet = await this.prisma.clubWallet.findUnique({
      where: { team_id: teamId },
    })
    if (!wallet) {
      throw new NotFoundException('Portefeuille club introuvable pour cette équipe.')
    }
    return wallet
  }
}
