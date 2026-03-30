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

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
