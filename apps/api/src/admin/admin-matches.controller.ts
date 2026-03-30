import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const MATCH_INCLUDE = {
  competition: { select: { id: true, name: true, type: true } },
  homeTeam: { select: { id: true, name: true, logo_url: true } },
  awayTeam: { select: { id: true, name: true, logo_url: true } },
} as const;

@Controller('admin/matches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminMatchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('competition_id') competitionId?: string) {
    const where = competitionId ? { competition_id: competitionId } : {};

    return this.prisma.match.findMany({
      where,
      orderBy: [{ status: 'asc' }, { round: 'asc' }],
      include: MATCH_INCLUDE,
    });
  }

  @Patch(':id/score')
  async updateScore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { home_score: number; away_score: number },
  ) {
    const match = await this.prisma.match.findUnique({ where: { id } });

    if (!match) {
      throw new NotFoundException('Match introuvable.');
    }

    if (match.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Seuls les matchs SCHEDULED peuvent recevoir un score.',
      );
    }

    if (body.home_score == null || body.away_score == null) {
      throw new BadRequestException('home_score et away_score sont requis.');
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data: {
        home_score: Number(body.home_score),
        away_score: Number(body.away_score),
        status: 'PLAYED',
        played_at: new Date(),
      },
      include: MATCH_INCLUDE,
    });

    return { message: 'Résultat enregistré.', match: updated };
  }
}
