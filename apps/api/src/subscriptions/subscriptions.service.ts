import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionPlanCode } from '@omjep/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { code: 'asc' },
    });
  }

  getMyActiveSubscriptions(userId: string) {
    const now = new Date();
    return this.prisma.userSubscription.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        end_date: { gte: now },
      },
      include: { plan: true },
      orderBy: { end_date: 'desc' },
    });
  }

  async buyPlan(userId: string, planCode: SubscriptionPlanCode) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.findUnique({
        where: { code: planCode },
      });
      if (!plan) {
        throw new NotFoundException('Plan introuvable.');
      }

      const now = new Date();

      const activeSame = await tx.userSubscription.findFirst({
        where: {
          user_id: userId,
          status: 'ACTIVE',
          end_date: { gte: now },
          plan: { code: planCode },
        },
        orderBy: { end_date: 'desc' },
      });

      const debited = await tx.user.updateMany({
        where: { id: userId, jepyCoins: { gte: plan.priceJepy } },
        data: { jepyCoins: { decrement: plan.priceJepy } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('Solde JEPY insuffisant.');
      }

      const addMs = plan.durationDays * 24 * 60 * 60 * 1000;

      let subscription;
      if (activeSame) {
        const newEnd = new Date(activeSame.end_date.getTime() + addMs);
        subscription = await tx.userSubscription.update({
          where: { id: activeSame.id },
          data: { end_date: newEnd },
        });
      } else {
        const end = new Date(now.getTime() + addMs);
        subscription = await tx.userSubscription.create({
          data: {
            user_id: userId,
            plan_id: plan.id,
            start_date: now,
            end_date: end,
            status: 'ACTIVE',
          },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: { isPremium: true },
      });

      if (planCode === 'PRESIDENT') {
        await tx.club.updateMany({
          where: { manager_id: userId },
          data: { presidentPremium: true },
        });
      }

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          omjepCoins: true,
          jepyCoins: true,
          isPremium: true,
        },
      });

      return { subscription, user, plan };
    });
  }

  /**
   * Marque les abonnements expirés, met à jour isPremium et repasse les clubs
   * en mode Standard (presidentPremium = false) si plus d’abonnement President actif.
   */
  async expireSubscriptions(): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.userSubscription.findMany({
      where: {
        status: 'ACTIVE',
        end_date: { lt: now },
      },
      select: { id: true, user_id: true },
    });

    if (expired.length === 0) {
      return;
    }

    const ids = expired.map((s) => s.id);
    await this.prisma.userSubscription.updateMany({
      where: { id: { in: ids } },
      data: { status: 'EXPIRED' },
    });

    const userIds = [...new Set(expired.map((s) => s.user_id))];

    for (const userId of userIds) {
      const hasActive = await this.prisma.userSubscription.findFirst({
        where: {
          user_id: userId,
          status: 'ACTIVE',
          end_date: { gte: now },
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: { isPremium: !!hasActive },
      });

      const hasPresident = await this.prisma.userSubscription.findFirst({
        where: {
          user_id: userId,
          status: 'ACTIVE',
          end_date: { gte: now },
          plan: { code: 'PRESIDENT' },
        },
      });

      if (!hasPresident) {
        await this.prisma.club.updateMany({
          where: { manager_id: userId },
          data: { presidentPremium: false },
        });
      }
    }

    this.logger.log(
      `Abonnements expirés: ${expired.length} (utilisateurs affectés: ${userIds.length})`,
    );
  }

  /** Tous les jours à 2h00 (serveur). */
  @Cron('0 2 * * *')
  async handleExpiredSubscriptionsCron(): Promise<void> {
    try {
      await this.expireSubscriptions();
    } catch (err) {
      this.logger.error(
        'Échec du job d’expiration des abonnements',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
