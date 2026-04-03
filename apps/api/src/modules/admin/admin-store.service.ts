import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import { AdminStoreItemCreateDto } from './dto/admin-store-item-create.dto';
import { AdminStoreItemPatchDto } from './dto/admin-store-item-patch.dto';
import { AdminStorePlanPatchDto } from './dto/admin-store-plan-patch.dto';

function parsePlanCode(raw: string): 'PLAYER' | 'PRESIDENT' {
  const u = raw.trim().toUpperCase();
  if (u === 'PLAYER' || u === 'PRESIDENT') return u;
  throw new BadRequestException('Code de plan invalide (PLAYER ou PRESIDENT).');
}

function normalizeFeatures(features: unknown): Prisma.InputJsonValue {
  if (features === null || features === undefined) {
    return [];
  }
  if (typeof features === 'string') {
    try {
      return JSON.parse(features) as Prisma.InputJsonValue;
    } catch {
      throw new BadRequestException('features doit être un JSON valide.');
    }
  }
  if (typeof features === 'object' || Array.isArray(features)) {
    return features as Prisma.InputJsonValue;
  }
  throw new BadRequestException('features doit être un objet ou un tableau JSON.');
}

@Injectable()
export class AdminStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();

    const activeSubscriptionsCount = await this.prisma.userSubscription
      .count({
        where: {
          status: 'ACTIVE',
          end_date: { gte: now },
        },
      })
      .catch(() => 0);

    let cosmeticRevenueJepy = 0;
    try {
      const cosmeticRows = await this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COALESCE(SUM(si.price_jepy), 0)::bigint AS total
        FROM user_inventory ui
        INNER JOIN store_items si ON ui.item_id = si.id
      `;
      cosmeticRevenueJepy = Number(cosmeticRows[0]?.total ?? 0);
    } catch {
      cosmeticRevenueJepy = 0;
    }

    let subscriptionRevenueJepy = 0;
    try {
      const subRows = await this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COALESCE(SUM(sp.price_jepy), 0)::bigint AS total
        FROM user_subscriptions us
        INNER JOIN subscription_plans sp ON us.plan_id = sp.id
      `;
      subscriptionRevenueJepy = Number(subRows[0]?.total ?? 0);
    } catch {
      subscriptionRevenueJepy = 0;
    }

    const theoreticalRevenueJepy = cosmeticRevenueJepy + subscriptionRevenueJepy;

    let topSellingItem: {
      id: string;
      name: string;
      salesCount: number;
    } | null = null;

    try {
      const topRows = await this.prisma.$queryRaw<[{ item_id: string; c: bigint }]>`
        SELECT item_id, COUNT(*)::bigint AS c
        FROM user_inventory
        GROUP BY item_id
        ORDER BY c DESC
        LIMIT 1
      `;

      if (topRows.length > 0) {
        const item = await this.prisma.storeItem
          .findUnique({
            where: { id: topRows[0].item_id },
            select: { id: true, name: true },
          })
          .catch(() => null);
        if (item) {
          topSellingItem = {
            id: item.id,
            name: item.name,
            salesCount: Number(topRows[0].c),
          };
        }
      }
    } catch {
      topSellingItem = null;
    }

    return {
      activeSubscriptionsCount,
      theoreticalRevenueJepy,
      cosmeticRevenueJepy,
      subscriptionRevenueJepy,
      topSellingItem,
    };
  }

  async updateItem(id: string, dto: AdminStoreItemPatchDto) {
    const exists = await this.prisma.storeItem.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Article introuvable.');
    }
    return this.prisma.storeItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priceJepy !== undefined && { priceJepy: dto.priceJepy }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });
  }

  async createItem(dto: AdminStoreItemCreateDto) {
    return this.prisma.storeItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        priceJepy: dto.priceJepy,
        category: dto.category,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  async updatePlan(codeParam: string, dto: AdminStorePlanPatchDto) {
    const code = parsePlanCode(codeParam);
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code },
    });
    if (!plan) {
      throw new NotFoundException('Plan introuvable.');
    }

    const data: Prisma.SubscriptionPlanUpdateInput = {};
    if (dto.priceJepy !== undefined) {
      data.priceJepy = dto.priceJepy;
    }
    if (dto.features !== undefined) {
      data.features = normalizeFeatures(dto.features);
    }

    if (Object.keys(data).length === 0) {
      return plan;
    }

    return this.prisma.subscriptionPlan.update({
      where: { code },
      data,
    });
  }
}
