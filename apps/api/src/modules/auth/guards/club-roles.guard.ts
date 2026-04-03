import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ClubRole } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import {
  CLUB_ROLES_KEY,
  CLUB_ROLES_MODE_KEY,
  type ClubRolesGuardMode,
} from '../decorators/club-roles.decorator';

@Injectable()
export class ClubRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<ClubRole[]>(CLUB_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const mode = this.reflector.getAllAndOverride<ClubRolesGuardMode>(
      CLUB_ROLES_MODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length || !mode) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{
      user?: { id: string };
      body?: { team_id?: string };
      params?: { id?: string };
    }>();
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Authentification requise.');
    }

    if (mode === 'invitation_body') {
      const teamId = req.body?.team_id;
      if (!teamId || typeof teamId !== 'string') {
        throw new BadRequestException('team_id est requis dans le corps de la requête.');
      }
      const membership = await this.prisma.teamMember.findFirst({
        where: { user_id: userId, team_id: teamId },
      });
      if (!membership || !roles.includes(membership.club_role as ClubRole)) {
        throw new ForbiddenException(
          'Accès refusé : rôle club insuffisant pour cette équipe.',
        );
      }
      return true;
    }

    if (mode === 'match_param') {
      const matchId = req.params?.id;
      if (!matchId) {
        throw new BadRequestException('Identifiant de match manquant.');
      }
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        select: { home_team_id: true, away_team_id: true },
      });
      if (!match) {
        throw new NotFoundException('Match introuvable.');
      }
      const membership = await this.prisma.teamMember.findFirst({
        where: {
          user_id: userId,
          team_id: { in: [match.home_team_id, match.away_team_id] },
          club_role: { in: roles },
        },
      });
      if (!membership) {
        throw new ForbiddenException(
          'Accès refusé : seuls les dirigeants du club (domicile ou extérieur) peuvent effectuer cette action.',
        );
      }
      return true;
    }

    return true;
  }
}
