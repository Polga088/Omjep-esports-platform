import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@omjep/database';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { LevelingService } from '../leveling/leveling.service';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leveling: LevelingService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
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
        stats: true,
      },
    });
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
        stats: true,
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    if (!user) throw new NotFoundException(`Joueur #${id} introuvable`);
    return user;
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

    return this.prisma.user.create({
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
      },
    });
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    await this.findOne(id);

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

    return this.prisma.user.update({
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
      },
    });
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

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        ea_persona_name: true,
        preferred_position: true,
        nationality: true,
      },
    });
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
      where: { user_id: id, expires_at: { gt: new Date() } },
      select: { salary: true, release_clause: true, expires_at: true },
    });

    return {
      user,
      team: currentMembership?.team ?? null,
      stats: { goals, assists, matches },
      contract: activeContract,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
