import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@api/prisma/prisma.service';

const CUP_ROUND_ORDER = [
  'Seizièmes de Finale',
  'Huitièmes de Finale',
  'Quarts de Finale',
  'Demi-Finales',
  'Finale',
] as const;

function roundOrderIndex(name: string): number {
  const i = CUP_ROUND_ORDER.indexOf(name as (typeof CUP_ROUND_ORDER)[number]);
  return i === -1 ? 999 : i;
}

/** Même logique que admin-competitions getCupRoundName */
function cupRoundLabelForTeamCount(teamCount: number): string {
  if (teamCount >= 32) return 'Seizièmes de Finale';
  if (teamCount >= 16) return 'Huitièmes de Finale';
  if (teamCount >= 8) return 'Quarts de Finale';
  if (teamCount >= 4) return 'Demi-Finales';
  return 'Finale';
}

function winnerTeamId(match: {
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
}): string {
  const h = match.home_score ?? 0;
  const a = match.away_score ?? 0;
  if (h > a) return match.home_team_id;
  if (a > h) return match.away_team_id;
  return match.home_team_id;
}

@Injectable()
export class TournamentAdvanceService {
  private readonly logger = new Logger(TournamentAdvanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */5 * * * *')
  async advanceCupBrackets(): Promise<void> {
    try {
      const cups = await this.prisma.competition.findMany({
        where: { type: 'CUP', status: 'ONGOING' },
        select: { id: true, name: true },
      });

      for (const cup of cups) {
        await this.tryAdvanceCompetition(cup.id, cup.name);
      }
    } catch (err) {
      this.logger.error(
        'advanceCupBrackets failed',
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private async tryAdvanceCompetition(competitionId: string, cupName: string): Promise<void> {
    const matches = await this.prisma.match.findMany({
      where: { competition_id: competitionId },
      orderBy: [{ id: 'asc' }],
    });

    if (matches.length === 0) return;

    const byRound = new Map<string, typeof matches>();
    for (const m of matches) {
      const r = m.round ?? '';
      if (!byRound.has(r)) byRound.set(r, []);
      byRound.get(r)!.push(m);
    }

    const roundNames = [...byRound.keys()].sort(
      (a, b) => roundOrderIndex(a) - roundOrderIndex(b),
    );

    for (const roundName of roundNames) {
      const ms = byRound.get(roundName)!;
      if (ms.length === 0) continue;
      if (!ms.every((m) => m.status === 'PLAYED')) continue;

      const winners = ms.map((m) => winnerTeamId(m));
      const nextLabel = cupRoundLabelForTeamCount(winners.length);

      const alreadyHasNext = matches.some((m) => (m.round ?? '') === nextLabel);
      if (alreadyHasNext) continue;

      if (winners.length < 2) {
        continue;
      }

      if (winners.length % 2 !== 0) {
        this.logger.warn(
          `[CupBot] « ${cupName} » : tour « ${roundName} » — nombre impair de vainqueurs (${winners.length}), avancement manuel requis.`,
        );
        continue;
      }

      const rows: {
        competition_id: string;
        home_team_id: string;
        away_team_id: string;
        round: string;
      }[] = [];

      const teams = [...winners];
      const half = teams.length / 2;
      for (let i = 0; i < half; i++) {
        const home = teams[i];
        const away = teams[teams.length - 1 - i];
        rows.push({
          competition_id: competitionId,
          home_team_id: home,
          away_team_id: away,
          round: nextLabel,
        });
      }

      if (rows.length === 0) continue;

      await this.prisma.match.createMany({ data: rows });
      this.logger.log(
        `[CupBot] « ${cupName} » : tour « ${nextLabel} » — ${rows.length} match(s) créé(s).`,
      );

      await this.tryAdvanceCompetition(competitionId, cupName);
      return;
    }
  }
}
