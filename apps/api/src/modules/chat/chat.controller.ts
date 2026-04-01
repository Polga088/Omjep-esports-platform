import {
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarkReadDto } from './dto/mark-read.dto';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('contacts/managers')
  async managerContacts(@Request() req: { user: { id: string } }) {
    return this.chat.listManagerContacts(req.user.id);
  }

  @Get('messages/team')
  async teamMessages(
    @Request() req: { user: { id: string } },
    @Query('teamId', ParseUUIDPipe) teamId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chat.listTeamMessages(req.user.id, teamId, cursor);
  }

  @Get('messages/dm')
  async dmMessages(
    @Request() req: { user: { id: string } },
    @Query('peerId', ParseUUIDPipe) peerId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chat.listDmMessages(req.user.id, peerId, cursor);
  }

  @Post('messages/read')
  async markRead(
    @Request() req: { user: { id: string } },
    @Body() dto: MarkReadDto,
  ) {
    return this.chat.markRead(req.user.id, dto.messageIds);
  }
}
