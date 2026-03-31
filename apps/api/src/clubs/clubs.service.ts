import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@omjep/database';
import { PrismaService } from '../prisma/prisma.service';
import { RequestClubCreationDto } from './dto/request-club-creation.dto';
import { AdminValidateClubDto } from './dto/admin-validate-club.dto';

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
