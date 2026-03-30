import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';

@Controller('admin/competitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCompetitionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async createCompetition(@Body() dto: CreateCompetitionDto) {
    const competition = await this.prisma.competition.create({
      data: {
        name: dto.name,
        type: dto.type,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        teams: dto.team_ids
          ? {
              create: dto.team_ids.map((team_id) => ({ team_id })),
            }
          : undefined,
      },
      include: { teams: { include: { team: true } } },
    });

    return { message: 'Compétition créée avec succès.', competition };
  }

  @Post(':id/generate-calendar')
  async generateCalendar(@Param('id', ParseUUIDPipe) id: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { id },
      include: { teams: true },
    });

    if (!competition) {
      throw new BadRequestException('Compétition introuvable.');
    }

    const teamIds = competition.teams.map((ct) => ct.team_id);

    if (teamIds.length < 2) {
      throw new BadRequestException(
        'Il faut au moins 2 équipes pour générer un calendrier.',
      );
    }

    const matches = this.generateRoundRobin(teamIds, id);

    const created = await this.prisma.match.createMany({ data: matches });

    await this.prisma.competition.update({
      where: { id },
      data: { status: 'ONGOING' },
    });

    return {
      message: `Calendrier généré : ${created.count} matchs créés.`,
      matchCount: created.count,
    };
  }

  private generateRoundRobin(
    teamIds: string[],
    competitionId: string,
  ) {
    const teams = [...teamIds];
    if (teams.length % 2 !== 0) {
      teams.push('BYE');
    }

    const totalRounds = teams.length - 1;
    const matchesPerRound = teams.length / 2;
    const matches: {
      competition_id: string;
      home_team_id: string;
      away_team_id: string;
      round: string;
    }[] = [];

    for (let round = 0; round < totalRounds; round++) {
      for (let match = 0; match < matchesPerRound; match++) {
        const home = teams[match];
        const away = teams[teams.length - 1 - match];

        if (home === 'BYE' || away === 'BYE') continue;

        matches.push({
          competition_id: competitionId,
          home_team_id: home,
          away_team_id: away,
          round: `Journée ${round + 1}`,
        });
      }

      const last = teams.pop()!;
      teams.splice(1, 0, last);
    }

    return matches;
  }
}
