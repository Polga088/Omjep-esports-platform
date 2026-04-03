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
import { ClubRole } from '@omjep/database';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClubRoles } from '../auth/decorators/club-roles.decorator';
import { ClubRolesGuard } from '../auth/guards/club-roles.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(ClubRolesGuard)
  @ClubRoles(
    'invitation_body',
    ClubRole.FOUNDER,
    ClubRole.MANAGER,
    ClubRole.CO_MANAGER,
  )
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(req.user.id, dto);
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
