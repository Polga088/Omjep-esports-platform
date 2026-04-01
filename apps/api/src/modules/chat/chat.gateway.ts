import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserRole } from '@omjep/shared';
import { Server, Socket } from 'socket.io';
import { chatDmRoomId, chatTeamRoomId } from '@omjep/shared';
import { PrismaService } from '@api/prisma/prisma.service';
import { ChatService } from './chat.service';

interface ClientData {
  userId: string;
}

function extractSocketToken(socket: Socket): string | undefined {
  const auth = socket.handshake.auth as { token?: string } | undefined;
  if (auth?.token) return auth.token;

  const q = socket.handshake.query?.token;
  const fromQuery = typeof q === 'string' ? q : Array.isArray(q) ? q[0] : undefined;
  if (fromQuery) return fromQuery;

  const raw = socket.handshake.headers?.authorization;
  if (typeof raw === 'string' && raw.startsWith('Bearer ')) {
    return raw.slice(7).trim();
  }
  return undefined;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: false },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly onlineManagers = new Set<string>();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  /**
   * Rejette toute connexion sans JWT valide avant handleConnection (évite l’écoute anonyme).
   */
  afterInit(server: Server) {
    server.use((socket: Socket, next: (err?: Error) => void) => {
      try {
        const raw = extractSocketToken(socket);
        if (!raw) {
          this.logger.warn('WS rejected: no token (auth, query or Authorization)');
          return next(new Error('Unauthorized'));
        }
        const payload = this.jwt.verify<{ sub: string }>(raw);
        (socket.data as ClientData).userId = payload.sub;
        next();
      } catch (e) {
        this.logger.warn(`WS rejected: invalid token — ${e}`);
        next(new Error('Unauthorized'));
      }
    });
  }

  async handleConnection(client: Socket) {
    const userId = (client.data as ClientData)?.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    await client.join(`user:${userId}`);

    this.logger.log(`User ${userId} joined room user:${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === UserRole.MANAGER) {
      this.onlineManagers.add(userId);
      this.server.emit('presence:managers', { onlineIds: [...this.onlineManagers] });
    }
  }

  /**
   * Mercato / transferts : pastille temps réel (ex. nouvelle offre pour le joueur).
   * Événement `transfer:mercato` — payload `{ type: 'TRANSFER_OFFER_RECEIVED', offer_id?: string }`.
   */
  emitTransferMercatoAlert(
    userId: string,
    payload: { type: string; offer_id?: string },
  ) {
    this.server.to(`user:${userId}`).emit('transfer:mercato', payload);
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as ClientData)?.userId;
    if (!userId) return;
    if (this.onlineManagers.has(userId)) {
      this.onlineManagers.delete(userId);
      this.server.emit('presence:managers', { onlineIds: [...this.onlineManagers] });
    }
  }

  @SubscribeMessage('join_team')
  async joinTeam(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { teamId: string },
  ) {
    const userId = (client.data as ClientData).userId;
    await this.chat.assertTeamAccess(userId, body.teamId);
    const room = chatTeamRoomId(body.teamId);
    await client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('join_dm')
  async joinDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { peerId: string },
  ) {
    const userId = (client.data as ClientData).userId;
    const room = chatDmRoomId(userId, body.peerId);
    await client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { teamId?: string; receiverId?: string; content: string },
  ) {
    const userId = (client.data as ClientData).userId;
    if (!body.content?.trim()) return { error: 'empty' };

    if (body.teamId) {
      const msg = await this.chat.createTeamMessage(userId, body.teamId, body.content.trim());
      this.server.to(chatTeamRoomId(body.teamId)).emit('message', msg);
      return msg;
    }
    if (body.receiverId) {
      const msg = await this.chat.createDmMessage(userId, body.receiverId, body.content.trim());
      this.server.to(chatDmRoomId(userId, body.receiverId)).emit('message', msg);
      return msg;
    }
    return { error: 'missing_target' };
  }

  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { teamId?: string; peerId?: string; isTyping: boolean },
  ) {
    const userId = (client.data as ClientData).userId;
    const room = body.teamId
      ? chatTeamRoomId(body.teamId)
      : body.peerId
        ? chatDmRoomId(userId, body.peerId)
        : null;
    if (!room) return;
    client.to(room).emit('typing', {
      userId,
      isTyping: !!body.isTyping,
      teamId: body.teamId ?? null,
      peerId: body.peerId ?? null,
    });
  }
}
