import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@omjep/database';
import { PrismaService } from '@api/prisma/prisma.service';
import { RequestClubCreationDto } from './dto/request-club-creation.dto';
import { AdminValidateClubDto } from './dto/admin-validate-club.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ProClubsService } from '../sync/proclubs.service';

/** Frais de licenciement (budget club, OC). */
export const KICK_MEMBER_FEE_OC = 5000;

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly proClubsService: ProClubsService,
  ) {}

  /** Liste des clubs visibles côté admin (tableau principal) — uniquement validés. */
  async findAll() {
    return this.prisma.club.findMany({
      where: { validation_status: 'APPROVED' },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async remove(id: string) {
    try {
      return await this.prisma.club.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Club #${id} introuvable.`);
      }
      throw error;
    }
  }

  async findAllForAdmin() {
    try {
      return await this.prisma.club.findMany({
        where: {
          validation_status: 'PENDING',
        },
        include: {
          manager: {
            select: {
              id: true,
              email: true,
              ea_persona_name: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    } catch (error) {
      console.error('❌ [ClubsService] findAllForAdmin:', error);
      throw error;
    }
  }

  async findManagedClub(managerId: string) {
    try {
      return await this.prisma.club.findFirst({
        where: { manager_id: managerId },
      });
    } catch {
      return null;
    }
  }

  async requestClubCreation(managerId: string, dto: RequestClubCreationDto) {
    console.log('[ClubsService] requestClubCreation — entrée', {
      managerId,
      name: dto.name,
      hasDescription: dto.description != null && dto.description !== '',
      hasLogoUrl: dto.logo_url != null && dto.logo_url !== '',
    });

    const existingAsManager = await this.prisma.club.findFirst({
      where: { manager_id: managerId },
    });
    if (existingAsManager) {
      throw new ConflictException(
        'Vous avez déjà un club associé à votre compte (demande ou club existant).',
      );
    }

    try {
      const club = await this.prisma.$transaction(async (tx) => {
        const created = await tx.club.create({
          data: {
            name: dto.name.trim(),
            description: dto.description?.trim() || null,
            logo_url: dto.logo_url ?? null,
            proclubs_url: dto.proclubs_url ?? null,
            ea_club_id: dto.ea_club_id ?? null,
            ...(dto.platform !== undefined ? { platform: dto.platform } : {}),
            validation_status: 'PENDING',
            manager: { connect: { id: managerId } },
          },
        });

        await tx.teamMember.create({
          data: {
            team_id: created.id,
            user_id: managerId,
            club_role: 'FOUNDER',
          },
        });

        return created;
      });

      console.log('[ClubsService] requestClubCreation — succès', {
        clubId: club.id,
        name: club.name,
        validation_status: club.validation_status,
      });

      return club;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Ce nom de club est déjà pris.');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('Utilisateur introuvable.');
      }

      console.error('[ClubsService] requestClubCreation — erreur complète:', error);
      throw new InternalServerErrorException(
        'Impossible de créer le club pour le moment.',
      );
    }
  }

  /**
   * Synchronise stats EA (ProClubs.io) : `player_stats` + XP prestige club.
   * Réservé au `manager_id` du club.
   */
  async syncClubStats(managerId: string, clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, manager_id: true },
    });

    if (!club) {
      throw new NotFoundException('Club introuvable.');
    }

    if (club.manager_id !== managerId) {
      throw new ForbiddenException(
        'Seul le manager du club peut lancer la synchronisation.',
      );
    }

    return this.proClubsService.syncClubStatsForClub(clubId);
  }

  async adminValidateClub(clubId: string, dto: AdminValidateClubDto) {
    try {
      return await this.prisma.club.update({
        where: { id: clubId },
        data: { validation_status: dto.validation_status },
      });
    } catch (error) {
      console.error('Erreur Validation Locale:', error);
      return { id: clubId, validation_status: dto.validation_status };
    }
  }

  /**
   * Licencie un joueur : −5000 OC budget club, retrait de l’effectif, notification système.
   * Réservé au `manager_id` du club ; uniquement les membres `PLAYER`.
   */
  async kickMember(managerId: string, targetUserId: string) {
    const club = await this.prisma.club.findFirst({
      where: { manager_id: managerId },
      include: {
        members: { select: { user_id: true, club_role: true } },
      },
    });

    if (!club) {
      throw new ForbiddenException('Seul le manager désigné du club peut licencier un joueur.');
    }

    if (targetUserId === managerId) {
      throw new BadRequestException('Vous ne pouvez pas vous licencier vous-même.');
    }

    const targetMembership = club.members.find((m) => m.user_id === targetUserId);
    if (!targetMembership) {
      throw new NotFoundException("Ce joueur n'est pas membre de votre club.");
    }

    if (targetMembership.club_role !== 'PLAYER') {
      throw new BadRequestException('Seuls les joueurs (rôle Joueur) peuvent être licenciés via cette action.');
    }

    const kickedUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { ea_persona_name: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const dec = await tx.club.updateMany({
        where: { id: club.id, budget: { gte: KICK_MEMBER_FEE_OC } },
        data: { budget: { decrement: KICK_MEMBER_FEE_OC } },
      });

      if (dec.count === 0) {
        throw new BadRequestException(
          `Budget club insuffisant : ${KICK_MEMBER_FEE_OC.toLocaleString('fr-FR')} OC requis pour licencier.`,
        );
      }

      await tx.transaction.create({
        data: {
          team_id: club.id,
          amount: -KICK_MEMBER_FEE_OC,
          type: 'KICK_FEE',
          description: `Licenciement — ${kickedUser?.ea_persona_name ?? 'joueur'} (−${KICK_MEMBER_FEE_OC.toLocaleString('fr-FR')} OC)`,
        },
      });

      await tx.contract.updateMany({
        where: {
          team_id: club.id,
          user_id: targetUserId,
          status: 'ACTIVE',
        },
        data: { status: 'TERMINATED' },
      });

      await tx.teamMember.delete({
        where: {
          user_id_team_id: { user_id: targetUserId, team_id: club.id },
        },
      });
    });

    await this.notifications.createNotification(targetUserId, {
      type: 'SYSTEM',
      title: 'Licenciement',
      message: `Vous avez été licencié du club ${club.name}. Les frais administratifs ont été réglés par le club.`,
      link: '/dashboard',
      metadata: { club_id: club.id, club_name: club.name, type: 'PLAYER_KICKED' },
      toastLevel: 'warning',
    });

    return {
      message: 'Joueur licencié.',
      fee_oc: KICK_MEMBER_FEE_OC,
      club_id: club.id,
      target_user_id: targetUserId,
    };
  }
}
