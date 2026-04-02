import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';

export type AppNotificationLevel = 'success' | 'error' | 'info' | 'warning';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Enregistre la notification en base et émet `app:notification` vers la room `user:{userId}`.
   */
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: AppNotificationLevel,
    metadata?: Record<string, unknown>,
  ) {
    const meta = {
      ...(metadata ?? {}),
      toastType: type,
    } as Record<string, unknown>;

    const row = await this.prisma.notification.create({
      data: {
        user_id: userId,
        title,
        message,
        metadata: meta as object,
      },
    });

    this.chatGateway.emitAppNotification(userId, {
      id: row.id,
      title,
      message,
      type,
      metadata: meta,
    });

    return row;
  }

  /** @deprecated Préférer `sendNotification` avec un niveau explicite. */
  async send(userId: string, title: string, message: string, metadata?: Record<string, unknown>) {
    return this.sendNotification(userId, title, message, 'info', metadata);
  }

  async sendToTeamManagers(
    teamId: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
    type: AppNotificationLevel = 'info',
  ) {
    const managers = await this.prisma.teamMember.findMany({
      where: { team_id: teamId, club_role: { in: ['FOUNDER', 'MANAGER', 'CO_MANAGER'] } },
      select: { user_id: true },
    });

    if (managers.length === 0) return [];

    const rows = [];
    for (const m of managers) {
      rows.push(await this.sendNotification(m.user_id, title, message, type, metadata));
    }
    return rows;
  }

  /** Tous les membres des équipes (ex. annonce de match). */
  async notifyUsersInTeams(
    teamIds: string[],
    title: string,
    message: string,
    type: AppNotificationLevel,
    metadata?: Record<string, unknown>,
  ) {
    if (teamIds.length === 0) return [];

    const members = await this.prisma.teamMember.findMany({
      where: { team_id: { in: teamIds } },
      select: { user_id: true },
    });

    const seen = new Set<string>();
    const rows = [];
    for (const m of members) {
      if (seen.has(m.user_id)) continue;
      seen.add(m.user_id);
      rows.push(await this.sendNotification(m.user_id, title, message, type, metadata));
    }
    return rows;
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { user_id: userId, is_read: false },
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
