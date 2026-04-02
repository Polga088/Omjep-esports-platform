import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import type { AdminGrantCoinsDto } from './dto/admin-grant-coins.dto';

/** Taux unifié : 1000 OC ⟷ 1 Jepy (les deux sens). */
const OC_PER_JEPY = 1000;

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Historique portefeuille joueur : échanges OC→Jepy et crédits admin.
   */
  async getWalletHistory(userId: string) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: { in: ['EXCHANGE', 'ADMIN_GRANT'] },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        created_at: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      description: r.description,
      created_at: r.created_at.toISOString(),
    }));
  }

  /**
   * Crédit manuel par un administrateur (OMJEP ou Jepy).
   */
  async adminGrantCoins(dto: AdminGrantCoinsDto) {
    const { userId, amount, currency, reason } = dto;

    return this.prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, omjepCoins: true, jepyCoins: true },
      });
      if (!target) {
        throw new NotFoundException('Utilisateur introuvable.');
      }

      if (currency === 'OC') {
        await tx.user.update({
          where: { id: userId },
          data: { omjepCoins: { increment: amount } },
        });
      } else {
        await tx.user.update({
          where: { id: userId },
          data: { jepyCoins: { increment: amount } },
        });
      }

      await tx.transaction.create({
        data: {
          user_id: userId,
          team_id: null,
          amount,
          type: 'ADMIN_GRANT',
          description: `${reason} — +${amount} ${currency === 'OC' ? 'OC' : 'Jepy'}`,
        },
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, omjepCoins: true, jepyCoins: true },
      });

      return {
        user: {
          id: user.id,
          omjepCoins: user.omjepCoins,
          jepyCoins: user.jepyCoins,
        },
      };
    });
  }

  /**
   * Échange OMJEP Coins → Jepy pour l’utilisateur authentifié.
   * Atomique : débit OC, crédit Jepy, ligne Transaction EXCHANGE.
   */
  async exchangeOcToJepy(userId: string, ocAmount: number) {
    if (!Number.isInteger(ocAmount)) {
      throw new BadRequestException('Le montant doit être un nombre entier.');
    }
    if (ocAmount < OC_PER_JEPY) {
      throw new BadRequestException(`Montant minimum : ${OC_PER_JEPY} OC.`);
    }
    if (ocAmount % OC_PER_JEPY !== 0) {
      throw new BadRequestException(
        `Le montant doit être un multiple de ${OC_PER_JEPY} OC.`,
      );
    }

    const jepyAmount = ocAmount / OC_PER_JEPY;

    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException('Utilisateur introuvable.');
      }

      const updated = await tx.user.updateMany({
        where: { id: userId, omjepCoins: { gte: ocAmount } },
        data: {
          omjepCoins: { decrement: ocAmount },
          jepyCoins: { increment: jepyAmount },
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          'Solde OMJEP insuffisant pour cet échange.',
        );
      }

      // Ligne d’historique EXCHANGE : user_id, type, amount (sortie OC), description
      await tx.transaction.create({
        data: {
          user_id: userId,
          team_id: null,
          type: 'EXCHANGE',
          amount: -ocAmount,
          description: `Échange : -${ocAmount} OC → +${jepyAmount} Jepy (1000 OC = 1 Jepy)`,
        },
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { omjepCoins: true, jepyCoins: true },
      });

      return {
        user: {
          omjepCoins: user.omjepCoins,
          jepyCoins: user.jepyCoins,
        },
      };
    });
  }

  /**
   * Échange inverse Jepy → OMJEP pour l’utilisateur authentifié.
   * Taux : 1 Jepy = 1000 OC. Débit Jepy, crédit OC, ligne EXCHANGE.
   */
  async exchangeJepyToOmjep(userId: string, jepyAmount: number) {
    if (!Number.isInteger(jepyAmount)) {
      throw new BadRequestException('Le montant doit être un nombre entier.');
    }
    if (jepyAmount < 1) {
      throw new BadRequestException('Montant minimum : 1 Jepy.');
    }

    const ocCredit = jepyAmount * OC_PER_JEPY;

    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!exists) {
        throw new NotFoundException('Utilisateur introuvable.');
      }

      const updated = await tx.user.updateMany({
        where: { id: userId, jepyCoins: { gte: jepyAmount } },
        data: {
          jepyCoins: { decrement: jepyAmount },
          omjepCoins: { increment: ocCredit },
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          'Solde Jepy insuffisant pour cet échange.',
        );
      }

      await tx.transaction.create({
        data: {
          user_id: userId,
          team_id: null,
          type: 'EXCHANGE',
          amount: -jepyAmount,
          description: `Échange inverse : -${jepyAmount} Jepy → +${ocCredit} OC (1 Jepy = ${OC_PER_JEPY} OC)`,
        },
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { omjepCoins: true, jepyCoins: true },
      });

      return {
        user: {
          omjepCoins: user.omjepCoins,
          jepyCoins: user.jepyCoins,
        },
      };
    });
  }
}
