import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(inviterId: string, teamId: string, inviteeEmail: string) {
    const membership = await this.prisma.teamMember.findFirst({
      where: { user_id: inviterId, team_id: teamId },
    });

    if (!membership) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette équipe.");
    }

    const allowedRoles = ['FOUNDER', 'MANAGER', 'CO_MANAGER'];
    if (!allowedRoles.includes(membership.club_role)) {
      throw new ForbiddenException(
        "Seuls les managers de l'équipe peuvent envoyer des invitations.",
      );
    }

    const invitee = await this.prisma.user.findUnique({
      where: { email: inviteeEmail },
    });

    if (invitee) {
      const alreadyMember = await this.prisma.teamMember.findFirst({
        where: { user_id: invitee.id, team_id: teamId },
      });
      if (alreadyMember) {
        throw new ConflictException('Ce joueur fait déjà partie de cette équipe.');
      }
    }

    const existingPending = await this.prisma.invitation.findFirst({
      where: {
        team_id: teamId,
        invitee_email: inviteeEmail,
        status: 'PENDING',
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'Une invitation en attente existe déjà pour ce joueur dans cette équipe.',
      );
    }

    return this.prisma.invitation.create({
      data: {
        team_id: teamId,
        inviter_id: inviterId,
        invitee_email: inviteeEmail,
        invitee_id: invitee?.id ?? null,
      },
      include: {
        team: { select: { id: true, name: true, logo_url: true } },
      },
    });
  }

  async findPendingForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return this.prisma.invitation.findMany({
      where: {
        invitee_email: user.email,
        status: 'PENDING',
      },
      include: {
        team: { select: { id: true, name: true, logo_url: true, platform: true } },
        inviter: { select: { id: true, ea_persona_name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async respond(
    invitationId: string,
    userId: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { team: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation introuvable.');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Cette invitation a déjà été traitée.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user || user.email !== invitation.invitee_email) {
      throw new ForbiddenException("Cette invitation ne vous est pas destinée.");
    }

    if (status === 'ACCEPTED') {
      const alreadyMember = await this.prisma.teamMember.findFirst({
        where: { user_id: userId, team_id: invitation.team_id },
      });

      if (alreadyMember) {
        throw new ConflictException('Vous faites déjà partie de cette équipe.');
      }

      // Transaction: update invitation + add to team roster
      const [updated] = await this.prisma.$transaction([
        this.prisma.invitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED', invitee_id: userId },
          include: {
            team: { select: { id: true, name: true, logo_url: true } },
          },
        }),
        this.prisma.teamMember.create({
          data: {
            user_id: userId,
            team_id: invitation.team_id,
            club_role: 'PLAYER',
          },
        }),
      ]);

      return updated;
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REJECTED', invitee_id: userId },
      include: {
        team: { select: { id: true, name: true, logo_url: true } },
      },
    });
  }
}
