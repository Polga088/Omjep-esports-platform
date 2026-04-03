import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
/// <reference types="multer" />
import { unlink } from 'fs/promises';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@api/prisma/prisma.service';
import { Prisma, AvatarRarity } from '@omjep/database';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { LevelingService } from '../leveling/leveling.service';
import { withWalletDefaults } from '../auth/wallet.util';

const SALT_ROUNDS = 10;

function mapAvatarRarityJson(
  r: AvatarRarity,
): 'common' | 'premium' | 'legendary' {
  switch (r) {
    case AvatarRarity.LEGENDARY:
      return 'legendary';
    case AvatarRarity.PREMIUM:
      return 'premium';
    case AvatarRarity.COMMON:
    default:
      return 'common';
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leveling: LevelingService,
  ) {}

  async findAll() {
    const rows = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        ea_persona_name: true,
        gamertag_psn: true,
        gamertag_xbox: true,
        preferred_position: true,
        nationality: true,
        created_at: true,
        omjepCoins: true,
        jepyCoins: true,
        stats: true,
      },
    });
    return rows.map((u) => withWalletDefaults(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        external_id: true,
        email: true,
        role: true,
        created_at: true,
        ea_persona_name: true,
        gamertag_psn: true,
        gamertag_xbox: true,
        preferred_position: true,
        nationality: true,
        xp: true,
        level: true,
        omjepCoins: true,
        jepyCoins: true,
        stats: true,
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    if (!user) throw new NotFoundException(`Joueur #${id} introuvable`);
    return withWalletDefaults(user);
  }

  async adminCreate(dto: AdminCreateUserDto) {
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingByEmail) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    if (dto.ea_persona_name) {
      const existing = await this.prisma.user.findUnique({
        where: { ea_persona_name: dto.ea_persona_name },
      });
      if (existing) {
        throw new ConflictException('Ce ea_persona_name est déjà pris.');
      }
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash,
        role: dto.role ?? 'PLAYER',
        ea_persona_name: dto.ea_persona_name,
        gamertag_psn: dto.gamertag_psn,
        gamertag_xbox: dto.gamertag_xbox,
        preferred_position: dto.preferred_position,
        nationality: dto.nationality,
      },
      select: {
        id: true,
        email: true,
        role: true,
        ea_persona_name: true,
        gamertag_psn: true,
        gamertag_xbox: true,
        preferred_position: true,
        nationality: true,
        created_at: true,
        omjepCoins: true,
        jepyCoins: true,
      },
    });
    return withWalletDefaults(created);
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto, requesterRole: string) {
    await this.findOne(id);

    const isAdmin = requesterRole === 'ADMIN';
    if (!isAdmin) {
      if (dto.role !== undefined) {
        throw new ForbiddenException(
          'Seuls les administrateurs peuvent modifier le rôle.',
        );
      }
      if (dto.level !== undefined || dto.xp !== undefined) {
        throw new ForbiddenException(
          'Seuls les administrateurs peuvent modifier le niveau ou l’XP.',
        );
      }
    }

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Cet email est déjà utilisé.');
      }
    }

    if (dto.ea_persona_name) {
      const existing = await this.prisma.user.findUnique({
        where: { ea_persona_name: dto.ea_persona_name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ce ea_persona_name est déjà pris.');
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.ea_persona_name !== undefined) data.ea_persona_name = dto.ea_persona_name;
    if (dto.gamertag_psn !== undefined) data.gamertag_psn = dto.gamertag_psn;
    if (dto.gamertag_xbox !== undefined) data.gamertag_xbox = dto.gamertag_xbox;
    if (dto.preferred_position !== undefined) {
      data.preferred_position = dto.preferred_position;
    }
    if (dto.nationality !== undefined) data.nationality = dto.nationality;

    if (dto.password !== undefined) {
      data.password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (dto.xp !== undefined) {
      data.xp = dto.xp;
      data.level = this.leveling.calculateLevel(dto.xp);
    } else if (dto.level !== undefined) {
      data.level = dto.level;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        ea_persona_name: true,
        gamertag_psn: true,
        gamertag_xbox: true,
        preferred_position: true,
        nationality: true,
        xp: true,
        level: true,
        created_at: true,
        omjepCoins: true,
        jepyCoins: true,
      },
    });
    return withWalletDefaults(updated);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.ea_persona_name) {
      const existing = await this.prisma.user.findUnique({
        where: { ea_persona_name: dto.ea_persona_name },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          `Le persona name "${dto.ea_persona_name}" est déjà utilisé par un autre joueur.`,
        );
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.ea_persona_name !== undefined) data.ea_persona_name = dto.ea_persona_name;
    if (dto.preferred_position !== undefined) data.preferred_position = dto.preferred_position;
    if (dto.nationality !== undefined) data.nationality = dto.nationality;
    if (dto.activeBannerUrl !== undefined) data.activeBannerUrl = dto.activeBannerUrl;
    if (dto.activeFrameUrl !== undefined) data.activeFrameUrl = dto.activeFrameUrl;
    if (dto.activeJerseyId !== undefined) {
      data.activeJersey = dto.activeJerseyId
        ? { connect: { id: dto.activeJerseyId } }
        : { disconnect: true };
    }
    if (dto.avatarRarity !== undefined) {
      data.avatarRarity =
        dto.avatarRarity === 'legendary'
          ? AvatarRarity.LEGENDARY
          : dto.avatarRarity === 'premium'
            ? AvatarRarity.PREMIUM
            : AvatarRarity.COMMON;
    }
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        ea_persona_name: true,
        preferred_position: true,
        nationality: true,
        activeBannerUrl: true,
        activeFrameUrl: true,
        activeJerseyId: true,
        avatarRarity: true,
        avatarUrl: true,
      },
    });

    return {
      ...updated,
      avatarRarity: mapAvatarRarityJson(updated.avatarRarity),
    };
  }

  private async removeFileIfExists(path: string | undefined) {
    if (!path) return;
    try {
      await unlink(path);
    } catch {
      /* ignore */
    }
  }

  /** Persiste un fichier avatar déjà écrit sur disque par Multer. */
  async saveAvatarFromUpload(userId: string, file?: Express.Multer.File) {
    if (!file?.filename) {
      await this.removeFileIfExists(file?.path);
      throw new BadRequestException('Fichier avatar requis.');
    }
    const ok = /^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.mimetype);
    if (!ok) {
      await this.removeFileIfExists(file.path);
      throw new BadRequestException('Image requise : JPEG, PNG, GIF ou WebP.');
    }
    const publicUrl = `/api/v1/uploads/avatars/${file.filename}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: { avatarUrl: true },
    });
    return { avatarUrl: updated.avatarUrl };
  }

  /** Persiste une bannière (image ou vidéo courte) uploadée. */
  async saveBannerFromUpload(userId: string, file?: Express.Multer.File) {
    if (!file?.filename) {
      await this.removeFileIfExists(file?.path);
      throw new BadRequestException('Fichier bannière requis.');
    }
    const ok =
      /^image\/(jpeg|pjpeg|png|gif|webp)$/i.test(file.mimetype) ||
      /^video\/(mp4|webm|quicktime)$/i.test(file.mimetype);
    if (!ok) {
      await this.removeFileIfExists(file.path);
      throw new BadRequestException('Bannière : image (JPEG, PNG, WebP…) ou vidéo MP4/WebM.');
    }
    const publicUrl = `/api/v1/uploads/banners/${file.filename}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { activeBannerUrl: publicUrl },
      select: { activeBannerUrl: true },
    });
    return { activeBannerUrl: updated.activeBannerUrl };
  }

  async getProfileCard(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        ea_persona_name: true,
        preferred_position: true,
        nationality: true,
        gamertag_psn: true,
        gamertag_xbox: true,
        role: true,
        created_at: true,
        xp: true,
        level: true,
      },
    });

    if (!user) throw new NotFoundException(`Joueur #${id} introuvable`);

    const currentMembership = await this.prisma.teamMember.findFirst({
      where: { user_id: id },
      orderBy: { joined_at: 'desc' },
      include: { team: true },
    });

    const teamIds = (
      await this.prisma.teamMember.findMany({
        where: { user_id: id },
        select: { team_id: true },
      })
    ).map((m) => m.team_id);

    const [goals, assists, matches] = await Promise.all([
      this.prisma.matchEvent.count({
        where: { player_id: id, type: 'GOAL' },
      }),
      this.prisma.matchEvent.count({
        where: { player_id: id, type: 'ASSIST' },
      }),
      teamIds.length > 0
        ? this.prisma.match.count({
            where: {
              status: { in: ['PLAYED', 'FINISHED'] },
              OR: [
                { home_team_id: { in: teamIds } },
                { away_team_id: { in: teamIds } },
              ],
            },
          })
        : Promise.resolve(0),
    ]);

    const activeContract = await this.prisma.contract.findFirst({
      where: {
        user_id: id,
        status: 'ACTIVE',
        end_date: { gt: new Date() },
      },
      select: { salary: true, release_clause: true, start_date: true, end_date: true },
    });

    return {
      user,
      team: currentMembership?.team ?? null,
      stats: { goals, assists, matches },
      contract: activeContract,
    };
  }

  /**
   * Valeur marchande indicative (OMJEP Coins) pour le mercato — calcul dynamique, non persisté.
   */
  async getMarketValue(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { stats: true },
    });
    if (!user) throw new NotFoundException(`Joueur #${id} introuvable`);

    const level = user.level ?? 1;
    const xp = user.xp ?? 0;
    const goals = user.stats?.goals ?? 0;
    const assists = user.stats?.assists ?? 0;
    const mp = user.stats?.matches_played ?? 0;

    const baseFromLevel = level * 10_000;
    const fromGoals = goals * 500;
    const fromAssists = assists * 200;
    const xpBonus = Math.floor(xp / 10);
    let suggestedOmjepCoins = baseFromLevel + fromGoals + fromAssists + xpBonus;

    if (mp >= 5) {
      const gpg = goals / mp;
      if (gpg >= 0.35) {
        suggestedOmjepCoins = Math.floor(suggestedOmjepCoins * 1.08);
      }
    }

    return {
      userId: id,
      ea_persona_name: user.ea_persona_name,
      suggestedOmjepCoins,
      breakdown: {
        level,
        xp,
        goals,
        assists,
        matches_played: mp,
        baseFromLevel,
        fromGoals,
        fromAssists,
        xpBonus,
      },
    };
  }

  /**
   * Recherche admin : pseudo (ea_persona_name) ou email contient la chaîne.
   * Avatar = logo du club du dernier membership (sinon null).
   */
  async searchForAdmin(rawQuery: string) {
    const query = rawQuery.trim();
    if (query.length === 0) {
      return [] as { id: string; username: string; avatar: string | null }[];
    }
    const take = 10;
    const rows = await this.prisma.user.findMany({
      where: {
        OR: [
          { ea_persona_name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: [{ ea_persona_name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        ea_persona_name: true,
        email: true,
        teamMemberships: {
          take: 1,
          orderBy: { joined_at: 'desc' },
          select: {
            team: { select: { logo_url: true } },
          },
        },
      },
    });
    return rows.map((u) => ({
      id: u.id,
      username: u.ea_persona_name ?? u.email.split('@')[0] ?? '—',
      avatar: u.teamMemberships[0]?.team?.logo_url ?? null,
    }));
  }

  /**
   * Suppression admin. Les FK Prisma gèrent la cascade (TeamMember, stats, offres…).
   * Les clubs managés voient `manager_id` mis à null (onDelete: SetNull sur Club.manager).
   */
  async remove(targetUserId: string, adminUserId: string) {
    if (targetUserId === adminUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer votre propre compte administrateur.',
      );
    }

    await this.findOne(targetUserId);

    try {
      return await this.prisma.user.delete({ where: { id: targetUserId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Impossible de supprimer cet utilisateur : des données liées empêchent la suppression.',
        );
      }
      throw error;
    }
  }
}
