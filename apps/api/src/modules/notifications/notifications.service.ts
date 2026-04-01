import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async send(userId: string, title: string, message: string, metadata?: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: { user_id: userId, title, message, metadata: (metadata as any) ?? undefined },
    });
  }

  async sendToTeamManagers(teamId: string, title: string, message: string, metadata?: Record<string, unknown>) {
    const managers = await this.prisma.teamMember.findMany({
      where: { team_id: teamId, club_role: { in: ['FOUNDER', 'MANAGER', 'CO_MANAGER'] } },
      select: { user_id: true },
    });

    if (managers.length === 0) return [];

    return this.prisma.notification.createMany({
      data: managers.map((m) => ({
        user_id: m.user_id,
        title,
        message,
        metadata: (metadata as any) ?? undefined,
      })),
    });
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, user_id: userId },
      data: { is_read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
  }
}
