import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TicketStatus } from '@omjep/database';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketReplyDto } from './dto/ticket-reply.dto';
import { AdminPatchTicketDto } from './dto/admin-patch-ticket.dto';

const ticketDetailInclude = {
  user: { select: { id: true, email: true, ea_persona_name: true } },
  replies: {
    orderBy: { created_at: 'asc' as const },
    include: {
      author: { select: { id: true, email: true, ea_persona_name: true, role: true } },
    },
  },
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Identifiant utilisateur manquant (JWT).');
    }
    return this.prisma.ticket.create({
      data: {
        user_id: userId,
        category: dto.category,
        /** Enum Prisma : chaîne exacte `OPEN` */
        status: TicketStatus.OPEN,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
      },
      include: ticketDetailInclude,
    });
  }

  async findMine(userId: string) {
    return this.prisma.ticket.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: ticketDetailInclude,
    });
  }

  async findAllAdmin() {
    return this.prisma.ticket.findMany({
      orderBy: { created_at: 'desc' },
      include: ticketDetailInclude,
    });
  }

  async findOne(id: string, requesterId: string, isAdmin: boolean) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketDetailInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable.');
    if (!isAdmin && ticket.user_id !== requesterId) {
      throw new ForbiddenException('Accès refusé.');
    }
    return ticket;
  }

  async addStaffReply(ticketId: string, authorId: string, dto: TicketReplyDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable.');
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Ce ticket est clos ; rouvrez-le avant de répondre.');
    }
    await this.prisma.ticketReply.create({
      data: {
        ticket_id: ticketId,
        author_id: authorId,
        body: dto.body.trim(),
        is_staff: true,
      },
    });

    if (ticket.user_id !== authorId) {
      await this.notifications.createNotification(ticket.user_id, {
        type: 'SUPPORT',
        title: 'Réponse sur votre ticket',
        message: `Le support a répondu à « ${ticket.subject} ».`,
        link: '/dashboard/support',
        metadata: { ticket_id: ticketId, category: 'SUPPORT' },
        toastLevel: 'info',
      });
    }

    return this.findOne(ticketId, authorId, true);
  }

  async adminPatch(ticketId: string, dto: AdminPatchTicketDto) {
    await this.findOneRaw(ticketId);
    if (dto.status === undefined) {
      throw new BadRequestException('Aucune modification demandée.');
    }
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: dto.status },
      include: ticketDetailInclude,
    });
  }

  private async findOneRaw(id: string) {
    const t = await this.prisma.ticket.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Ticket introuvable.');
    return t;
  }
}
