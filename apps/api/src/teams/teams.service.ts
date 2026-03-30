import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@omjep/database';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                ea_persona_name: true,
                preferred_position: true,
                stats: true,
              },
            },
          },
        },
      },
    });

    if (!team) throw new NotFoundException(`Club #${id} introuvable`);
    return team;
  }

  async create(data: Prisma.TeamCreateInput) {
    return this.prisma.team.create({ data });
  }

  async update(id: string, data: Prisma.TeamUpdateInput) {
    await this.findOne(id);
    return this.prisma.team.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.team.delete({ where: { id } });
  }

  async addMember(teamId: string, userId: string, clubRole: Prisma.TeamMemberCreateInput['club_role']) {
    return this.prisma.teamMember.create({
      data: {
        team: { connect: { id: teamId } },
        user: { connect: { id: userId } },
        club_role: clubRole,
      },
    });
  }

  async removeMember(teamId: string, userId: string) {
    return this.prisma.teamMember.delete({
      where: { user_id_team_id: { user_id: userId, team_id: teamId } },
    });
  }
}
