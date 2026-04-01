import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@omjep/shared';
import { CHAT_MESSAGES_PAGE_SIZE } from '@omjep/shared';
import { PrismaService } from '@api/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async assertTeamAccess(userId: string, teamId: string): Promise<void> {
    const [member, managed] = await Promise.all([
      this.prisma.teamMember.findFirst({ where: { user_id: userId, team_id: teamId } }),
      this.prisma.club.findFirst({ where: { id: teamId, manager_id: userId } }),
    ]);
    if (!member && !managed) {
      throw new ForbiddenException('Accès au salon de ce club refusé.');
    }
  }

  async listTeamMessages(
    userId: string,
    teamId: string,
    cursor?: string,
    limit = CHAT_MESSAGES_PAGE_SIZE,
  ) {
    await this.assertTeamAccess(userId, teamId);
    const take = Math.min(limit + 1, 101);
    const where = {
      team_id: teamId,
      ...(cursor ? { created_at: { lt: new Date(cursor) } as const } : {}),
    };
    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take,
      include: {
        sender: { select: { id: true, email: true, ea_persona_name: true } },
      },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const chronological = [...page].reverse();
    const nextCursor =
      hasMore && chronological.length > 0 ? chronological[0].created_at.toISOString() : null;
    return {
      messages: chronological.map((m) => this.serializeMessage(m)),
      nextCursor,
      hasMore,
    };
  }

  async listDmMessages(
    userId: string,
    peerId: string,
    cursor?: string,
    limit = CHAT_MESSAGES_PAGE_SIZE,
  ) {
    if (peerId === userId) {
      throw new ForbiddenException('Conversation invalide.');
    }
    const take = Math.min(limit + 1, 101);
    const where = {
      team_id: null,
      OR: [
        { sender_id: userId, receiver_id: peerId },
        { sender_id: peerId, receiver_id: userId },
      ],
      ...(cursor ? { created_at: { lt: new Date(cursor) } as const } : {}),
    };
    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take,
      include: {
        sender: { select: { id: true, email: true, ea_persona_name: true } },
      },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const chronological = [...page].reverse();
    const nextCursor =
      hasMore && chronological.length > 0 ? chronological[0].created_at.toISOString() : null;
    return {
      messages: chronological.map((m) => this.serializeMessage(m)),
      nextCursor,
      hasMore,
    };
  }

  async createTeamMessage(senderId: string, teamId: string, content: string) {
    await this.assertTeamAccess(senderId, teamId);
    const msg = await this.prisma.message.create({
      data: {
        sender_id: senderId,
        team_id: teamId,
        content,
        receiver_id: null,
      },
      include: {
        sender: { select: { id: true, email: true, ea_persona_name: true } },
      },
    });
    return this.serializeMessage(msg);
  }

  async createDmMessage(senderId: string, receiverId: string, content: string) {
    if (receiverId === senderId) throw new ForbiddenException('Destinataire invalide.');
    const peer = await this.prisma.user.findUnique({ where: { id: receiverId } });
    if (!peer) throw new NotFoundException('Utilisateur introuvable.');
    const msg = await this.prisma.message.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        team_id: null,
      },
      include: {
        sender: { select: { id: true, email: true, ea_persona_name: true } },
      },
    });
    return this.serializeMessage(msg);
  }

  async markRead(userId: string, messageIds: string[]) {
    await this.prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiver_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });
    return { ok: true };
  }

  async listManagerContacts(excludeUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.MANAGER,
        id: { not: excludeUserId },
      },
      select: {
        id: true,
        email: true,
        ea_persona_name: true,
        role: true,
      },
      take: 200,
      orderBy: { ea_persona_name: 'asc' },
    });
    return users;
  }

  serializeMessage(m: {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    team_id: string | null;
    content: string;
    is_read: boolean;
    created_at: Date;
    sender?: { id: string; email: string; ea_persona_name: string | null } | null;
  }) {
    return {
      id: m.id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      team_id: m.team_id,
      content: m.content,
      is_read: m.is_read,
      created_at: m.created_at.toISOString(),
      sender: m.sender ?? undefined,
    };
  }
}
