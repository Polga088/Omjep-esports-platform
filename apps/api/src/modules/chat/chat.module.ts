import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

/**
 * Chat temps réel (Socket.io) + API REST pagination.
 * Structure « feature » : gateway, service, controller, dto regroupés ici.
 */
@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
