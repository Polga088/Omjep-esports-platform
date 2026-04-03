import { Injectable } from '@nestjs/common';
import { NotificationType } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';

export type AppNotificationLevel = 'success' | 'error' | 'info' | 'warning';

export type CreateNotificationData = {
  type: NotificationType;
  title: string;
  message: string;
  /** Si absent, lien par défaut selon le type (MATCH/TRANSFER/SUPPORT). */
  link?: string | null;
  metadata?: Record<string, unknown>;
  toastLevel?: AppNotificationLevel;
};

function inferNotificationType(metadata?: Record<string, unknown>): NotificationType {
  if (!metadata) return 'SYSTEM';
  if (metadata.category === 'MATCH') return 'MATCH';
  if (metadata.category === 'SUPPORT') return 'SUPPORT';
  const t = typeof metadata.type === 'string' ? metadata.type : '';
  if (t.includes('TRANSFER') || t.startsWith('TRANSFER')) return 'TRANSFER';
  return 'SYSTEM';
}

function defaultLinkForType(type: NotificationType): string | null {
  switch (type) {
    case 'MATCH':
      return '/dashboard/matches';
    case 'TRANSFER':
      return '/dashboard/transfers';
    case 'SUPPORT':
      return '/dashboard/support';
    default:
      return null;
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Crée une notification persistante et émet `app:notification` vers la room `user:{userId}`.
   */
  async createNotification(userId: string, data: CreateNotificationData) {
    const toastLevel = data.toastLevel ?? 'info';
    const link =
      data.link !== undefined && data.link !== null
        ? data.link
        : defaultLinkForType(data.type);

    const row = await this.prisma.notification.create({
      data: {
        user_id: userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: link ?? undefined,
        metadata: data.metadata ? (data.metadata as object) : undefined,
      },
    });

    const meta = {
      ...(data.metadata ?? {}),
      toastType: toastLevel,
      notificationType: data.type,
      link: link ?? null,
    } as Record<string, unknown>;

    this.chatGateway.emitAppNotification(userId, {
      id: row.id,
      title: data.title,
      message: data.message,
      type: toastLevel,
      metadata: meta,
      link: link ?? null,
      notificationType: data.type,
    });

    return row;
  }

  /**
   * Enregistre la notification en base et émet `app:notification` vers la room `user:{userId}`.
   */
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: AppNotificationLevel,
    metadata?: Record<string, unknown>,
    overrides?: { notificationType?: NotificationType; link?: string | null },
  ) {
    const nt = overrides?.notificationType ?? inferNotificationType(metadata);
    const link =
      overrides?.link !== undefined ? overrides.link : defaultLinkForType(nt);

    return this.createNotification(userId, {
      type: nt,
      title,
      message,
      link,
      metadata,
      toastLevel: type,
    });
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
    overrides?: { notificationType?: NotificationType; link?: string | null },
  ) {
    const managers = await this.prisma.teamMember.findMany({
      where: { team_id: teamId, club_role: { in: ['FOUNDER', 'MANAGER', 'CO_MANAGER'] } },
      select: { user_id: true },
    });

    if (managers.length === 0) return [];

    const rows = [];
    for (const m of managers) {
      rows.push(await this.sendNotification(m.user_id, title, message, type, metadata, overrides));
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
    overrides?: { notificationType?: NotificationType; link?: string | null },
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
      rows.push(await this.sendNotification(m.user_id, title, message, type, metadata, overrides));
    }
    return rows;
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10,
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
