import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(
      req.user.id,
      dto.team_id,
      dto.invitee_email,
    );
  }

  @Get('my-pending')
  findMyPending(@Request() req: { user: { id: string } }) {
    return this.invitationsService.findPendingForUser(req.user.id);
  }

  @Patch(':id/respond')
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: RespondInvitationDto,
  ) {
    return this.invitationsService.respond(id, req.user.id, dto.status);
  }
}
