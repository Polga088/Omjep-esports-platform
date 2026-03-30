import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@omjep/database';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: {
        stats: true,
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    if (!user) throw new NotFoundException(`Joueur #${id} introuvable`);
    return user;
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data });
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
