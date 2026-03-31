import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@omjep/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  listAvailableItems() {
    return this.prisma.storeItem.findMany({
      where: { isAvailable: true },
      orderBy: [{ category: 'asc' }, { priceJepy: 'asc' }],
    });
  }

  getMyInventory(userId: string) {
    return this.prisma.userInventory.findMany({
      where: { user_id: userId },
      include: { item: true },
      orderBy: { purchased_at: 'desc' },
    });
  }

  async buyItem(userId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.storeItem.findFirst({
        where: { id: itemId, isAvailable: true },
      });
      if (!item) {
        throw new NotFoundException('Article introuvable ou indisponible.');
      }

      const already = await tx.userInventory.findUnique({
        where: {
          user_id_item_id: { user_id: userId, item_id: itemId },
        },
      });
      if (already) {
        throw new ConflictException('Vous possédez déjà cet article.');
      }

      const debited = await tx.user.updateMany({
        where: { id: userId, jepyCoins: { gte: item.priceJepy } },
        data: { jepyCoins: { decrement: item.priceJepy } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('Solde JEPY insuffisant.');
      }

      try {
        await tx.userInventory.create({
          data: { user_id: userId, item_id: itemId },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          await tx.user.update({
            where: { id: userId },
            data: { jepyCoins: { increment: item.priceJepy } },
          });
          throw new ConflictException('Vous possédez déjà cet article.');
        }
        throw error;
      }

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, omjepCoins: true, jepyCoins: true },
      });

      return { item, user };
    });
  }
}
