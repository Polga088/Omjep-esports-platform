import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicStats() {
    const [totalPlayers, totalClubs, transferVolume, totalMatches] =
      await Promise.all([
        this.prisma.user.count({ where: { role: 'PLAYER' } }),
        this.prisma.club.count({ where: { validation_status: 'APPROVED' } }),
        this.prisma.transaction.aggregate({
          where: { type: 'TRANSFER', amount: { gt: 0 } },
          _sum: { amount: true },
        }),
        this.prisma.match.count({ where: { status: 'FINISHED' } }),
      ]);

    return {
      totalPlayers,
      totalClubs,
      transferVolume: transferVolume._sum.amount ?? 0,
      totalMatches,
    };
  }
}
