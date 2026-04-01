import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@api/prisma/prisma.service';
import { EventType } from '@omjep/shared';
import {
  TopPlayerRow,
  TopStatEntry,
  TopStatsResponse,
  HallOfFameEntry,
  HallOfFameTeam,
} from './types/competition-stats.types';

// ─── Shared types ────────────────────────────────────────────────────────────

export interface StandingRow {
  rank: number;
  team: { id: string; name: string; logo_url: string | null };
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
}

export interface MatchBrief {
  id: string;
  round: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  homeTeam: { id: string; name: string; logo_url: string | null };
  awayTeam: { id: string; name: string; logo_url: string | null };
}

interface CompetitionMeta {
  id: string;
  name: string;
  type: string;
  status: string;
}

// ─── Response union ───────────────────────────────────────────────────────────

export type StandingsResponse =
  | {
      type: 'LEAGUE';
      competition: CompetitionMeta;
      standings: StandingRow[];
      /** Derniers résultats (les plus récents en premier) */
      recentMatches: MatchBrief[];
    }
  | {
      type: 'CUP';
      competition: CompetitionMeta;
      rounds: { name: string; matches: MatchBrief[] }[];
    }
  | {
      type: 'CHAMPIONS';
      competition: CompetitionMeta;
      groups: { name: string; standings: StandingRow[]; matches: MatchBrief[] }[];
      knockoutRounds: { name: string; matches: MatchBrief[] }[];
    };

// ─── Cup round order ──────────────────────────────────────────────────────────

const CUP_ROUND_ORDER = [
  'Seizièmes de Finale',
  'Huitièmes de Finale',
  'Quarts de Finale',
  'Demi-Finales',
  'Finale',
];

// ─── Helper: compute standings from a set of PLAYED matches ──────────────────

function computeStandings(
  teams: { id: string; name: string; logo_url: string | null }[],
  matches: { home_team_id: string; away_team_id: string; home_score: number | null; away_score: number | null }[],
): StandingRow[] {
  const map = new Map<string, Omit<StandingRow, 'rank'>>();

  for (const t of teams) {
    map.set(t.id, {
      team: { id: t.id, name: t.name, logo_url: t.logo_url },
      points: 0, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, diff: 0,
    });
  }

  for (const m of matches) {
    const hs = m.home_score ?? 0;
    const as = m.away_score ?? 0;
    const home = map.get(m.home_team_id);
    const away = map.get(m.away_team_id);

    if (home) { home.played++; home.goalsFor += hs; home.goalsAgainst += as; }
    if (away) { away.played++; away.goalsFor += as; away.goalsAgainst += hs; }

    if (hs > as) {
      if (home) { home.won++; home.points += 3; }
      if (away) { away.lost++; }
    } else if (hs < as) {
      if (away) { away.won++; away.points += 3; }
      if (home) { home.lost++; }
    } else {
      if (home) { home.drawn++; home.points += 1; }
      if (away) { away.drawn++; away.points += 1; }
    }
  }

  const sorted = Array.from(map.values()).map((r) => ({ ...r, diff: r.goalsFor - r.goalsAgainst }));
  sorted.sort((a, b) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor);
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ─── Helper: map a DB match to MatchBrief ────────────────────────────────────

function matchSortKey(m: {
  played_at: Date | null;
  scheduled_at: Date | null;
  id: string;
}): number {
  const t = m.played_at ?? m.scheduled_at;
  return t ? t.getTime() : 0;
}

function sortMatchesChronological<
  T extends {
    played_at: Date | null;
    scheduled_at: Date | null;
    id: string;
  },
>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    const ka = matchSortKey(a);
    const kb = matchSortKey(b);
    if (ka !== kb) return ka - kb;
    return a.id.localeCompare(b.id);
  });
}

function toMatchBrief(m: {
  id: string;
  round: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  homeTeam: { id: string; name: string; logo_url: string | null };
  awayTeam: { id: string; name: string; logo_url: string | null };
}): MatchBrief {
  return {
    id: m.id,
    round: m.round,
    status: m.status,
    home_score: m.home_score,
    away_score: m.away_score,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Top stats (unchanged) ─────────────────────────────────────────────────

  async getTopStats(competitionId: string): Promise<TopStatsResponse> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true },
    });

    if (!competition) {
      throw new NotFoundException('Compétition introuvable.');
    }

    const events = await this.prisma.matchEvent.findMany({
      where: { match: { competition_id: competitionId, status: 'PLAYED' } },
      include: {
        player: { select: { id: true, ea_persona_name: true } },
        team: { select: { id: true, name: true, logo_url: true } },
      },
    });

    const aggregate = (type: EventType): TopStatEntry[] => {
      const map = new Map<string, TopStatEntry>();
      for (const event of events) {
        if (event.type !== type) continue;
        const existing = map.get(event.player_id);
        if (existing) {
          existing.count++;
        } else {
          map.set(event.player_id, { player: event.player, team: event.team, count: 1 });
        }
      }
      return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    };

    return { topScorers: aggregate('GOAL'), topAssisters: aggregate('ASSIST') };
  }

  /**
   * Stats combinées par joueur pour la compétition (buts/ passes / matchs joués
   * dans cette compétition uniquement). `player_stats` est global : on agrège
   * via les MatchEvent et la participation aux matchs (TeamMember).
   */
  async getTopPlayers(competitionId: string): Promise<TopPlayerRow[]> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true },
    });

    if (!competition) {
      throw new NotFoundException('Compétition introuvable.');
    }

    const playedMatches = await this.prisma.match.findMany({
      where: { competition_id: competitionId, status: 'PLAYED' },
      select: { id: true, home_team_id: true, away_team_id: true },
    });

    const teamIdsInComp = await this.prisma.competitionTeam.findMany({
      where: { competition_id: competitionId },
      select: { team_id: true },
    });
    const allowedTeamIds = new Set(teamIdsInComp.map((c) => c.team_id));

    const matchIds = playedMatches.map((m) => m.id);
    const matchParticipation = new Map<string, Set<string>>();

    if (matchIds.length > 0 && allowedTeamIds.size > 0) {
      const members = await this.prisma.teamMember.findMany({
        where: { team_id: { in: [...allowedTeamIds] } },
        select: { user_id: true, team_id: true },
      });

      for (const m of playedMatches) {
        const inMatch = members.filter(
          (tm) => tm.team_id === m.home_team_id || tm.team_id === m.away_team_id,
        );
        for (const tm of inMatch) {
          if (!matchParticipation.has(tm.user_id)) {
            matchParticipation.set(tm.user_id, new Set());
          }
          matchParticipation.get(tm.user_id)!.add(m.id);
        }
      }
    }

    const events = await this.prisma.matchEvent.findMany({
      where: {
        match: { competition_id: competitionId, status: 'PLAYED' },
      },
      select: {
        player_id: true,
        type: true,
        team: { select: { name: true } },
      },
    });

    const goalsBy = new Map<string, number>();
    const assistsBy = new Map<string, number>();
    const teamNameByPlayer = new Map<string, string>();

    for (const e of events) {
      if (e.type === 'GOAL') {
        goalsBy.set(e.player_id, (goalsBy.get(e.player_id) ?? 0) + 1);
      } else if (e.type === 'ASSIST') {
        assistsBy.set(e.player_id, (assistsBy.get(e.player_id) ?? 0) + 1);
      }
      if (!teamNameByPlayer.has(e.player_id) && e.team?.name) {
        teamNameByPlayer.set(e.player_id, e.team.name);
      }
    }

    const userIds = new Set<string>([
      ...matchParticipation.keys(),
      ...goalsBy.keys(),
      ...assistsBy.keys(),
    ]);

    if (userIds.size === 0) {
      return [];
    }

    const [users, memberships] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: [...userIds] } },
        select: { id: true, ea_persona_name: true },
      }),
      allowedTeamIds.size > 0
        ? this.prisma.teamMember.findMany({
            where: {
              user_id: { in: [...userIds] },
              team_id: { in: [...allowedTeamIds] },
            },
            include: { team: { select: { name: true } } },
            orderBy: { joined_at: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const teamNameFallback = new Map<string, string>();
    for (const m of memberships) {
      if (!teamNameFallback.has(m.user_id)) {
        teamNameFallback.set(m.user_id, m.team.name);
      }
    }

    const rows: TopPlayerRow[] = [];

    for (const uid of userIds) {
      const goals = goalsBy.get(uid) ?? 0;
      const assists = assistsBy.get(uid) ?? 0;
      const mp = matchParticipation.get(uid)?.size ?? 0;
      const user = users.find((u) => u.id === uid);
      const teamName =
        teamNameByPlayer.get(uid) ?? teamNameFallback.get(uid) ?? '—';

      const average_rating =
        mp > 0 ? Math.round(((goals * 2 + assists) / mp) * 100) / 100 : 0;

      rows.push({
        ea_persona_name: user?.ea_persona_name ?? '—',
        team_name: teamName,
        goals,
        assists,
        matches_played: mp,
        average_rating,
      });
    }

    rows.sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return b.average_rating - a.average_rating;
    });

    return rows;
  }

  // ── Unified standings ─────────────────────────────────────────────────────

  async getStandings(competitionId: string): Promise<StandingsResponse> {
    const competition = await this.prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        teams: { include: { team: { select: { id: true, name: true, logo_url: true } } } },
        matches: {
          include: {
            homeTeam: { select: { id: true, name: true, logo_url: true } },
            awayTeam: { select: { id: true, name: true, logo_url: true } },
          },
          orderBy: { round: 'asc' },
        },
      },
    });

    if (!competition) {
      throw new NotFoundException('Compétition introuvable.');
    }

    const meta: CompetitionMeta = {
      id: competition.id,
      name: competition.name,
      type: competition.type,
      status: competition.status,
    };

    // ── LEAGUE ──────────────────────────────────────────────────────────────
    if (competition.type === 'LEAGUE') {
      const playedMatches = competition.matches.filter((m) => m.status === 'PLAYED');
      const teams = competition.teams.map((ct) => ct.team);
      const standings = computeStandings(teams, playedMatches);

      const playedSorted = sortMatchesChronological(
        competition.matches.filter((m) => m.status === 'PLAYED'),
      );
      const recentMatches = playedSorted
        .slice(-15)
        .reverse()
        .map(toMatchBrief);

      return { type: 'LEAGUE', competition: meta, standings, recentMatches };
    }

    // ── CUP ─────────────────────────────────────────────────────────────────
    if (competition.type === 'CUP') {
      type M = (typeof competition.matches)[number];
      const roundMap = new Map<string, M[]>();

      for (const m of competition.matches) {
        const roundName = m.round ?? 'Tour préliminaire';
        if (!roundMap.has(roundName)) roundMap.set(roundName, []);
        roundMap.get(roundName)!.push(m);
      }

      const rounds = Array.from(roundMap.entries())
        .sort(([a], [b]) => {
          const ia = CUP_ROUND_ORDER.indexOf(a);
          const ib = CUP_ROUND_ORDER.indexOf(b);
          if (ia === -1 && ib === -1) return a.localeCompare(b);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        })
        .map(([name, ms]) => ({
          name,
          matches: sortMatchesChronological(ms).map(toMatchBrief),
        }));

      return { type: 'CUP', competition: meta, rounds };
    }

    // ── CHAMPIONS ────────────────────────────────────────────────────────────
    // Group matches: round starts with "Groupe "
    // Knockout matches: round is a CUP round name
    const groupMatches = competition.matches.filter(
      (m) => m.round && m.round.startsWith('Groupe '),
    );
    const knockoutMatches = competition.matches.filter(
      (m) => !m.round || !m.round.startsWith('Groupe '),
    );

    // Build per-group standings
    const groupNames = [...new Set(groupMatches.map((m) => m.round!))].sort();
    const groups = groupNames.map((groupName) => {
      const gMatches = groupMatches.filter((m) => m.round === groupName);
      const playedGMatches = gMatches.filter((m) => m.status === 'PLAYED');

      const teamMap = new Map<string, { id: string; name: string; logo_url: string | null }>();
      for (const m of gMatches) {
        teamMap.set(m.homeTeam.id, m.homeTeam);
        teamMap.set(m.awayTeam.id, m.awayTeam);
      }
      const groupTeams = Array.from(teamMap.values());
      const standings = computeStandings(groupTeams, playedGMatches);

      return {
        name: groupName,
        standings,
        matches: sortMatchesChronological(gMatches).map(toMatchBrief),
      };
    });

    type KM = (typeof competition.matches)[number];
    const knockoutRoundMap = new Map<string, KM[]>();
    for (const m of knockoutMatches) {
      const roundName = m.round ?? 'Tour préliminaire';
      if (!knockoutRoundMap.has(roundName)) knockoutRoundMap.set(roundName, []);
      knockoutRoundMap.get(roundName)!.push(m);
    }

    const knockoutRounds = Array.from(knockoutRoundMap.entries())
      .sort(([a], [b]) => {
        const ia = CUP_ROUND_ORDER.indexOf(a);
        const ib = CUP_ROUND_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .map(([name, ms]) => ({
        name,
        matches: sortMatchesChronological(ms).map(toMatchBrief),
      }));

    return { type: 'CHAMPIONS', competition: meta, groups, knockoutRounds };
  }

  // ── Hall of Fame (compétitions terminées) ─────────────────────────────────

  async getHallOfFame(): Promise<HallOfFameEntry[]> {
    const competitions = await this.prisma.competition.findMany({
      where: { status: 'FINISHED' },
      orderBy: { end_date: 'desc' },
      include: {
        teams: {
          include: {
            team: { select: { id: true, name: true, logo_url: true } },
          },
        },
        matches: {
          include: {
            homeTeam: { select: { id: true, name: true, logo_url: true } },
            awayTeam: { select: { id: true, name: true, logo_url: true } },
          },
        },
      },
    });

    const entries: HallOfFameEntry[] = [];

    for (const c of competitions) {
      const champion = this.resolveChampion(c);
      const topPlayers = await this.getTopPlayers(c.id);
      const goldenBoot = topPlayers[0]
        ? {
            ea_persona_name: topPlayers[0].ea_persona_name,
            team_name: topPlayers[0].team_name,
            goals: topPlayers[0].goals,
          }
        : null;

      const topAssister =
        topPlayers.length === 0
          ? null
          : [...topPlayers].sort(
              (a, b) => b.assists - a.assists || b.goals - a.goals,
            )[0];

      entries.push({
        competition: {
          id: c.id,
          name: c.name,
          type: c.type,
          start_date: c.start_date.toISOString(),
          end_date: c.end_date.toISOString(),
        },
        seasonLabel: this.formatSeasonLabel(c.start_date, c.end_date),
        champion,
        goldenBoot,
        topAssister: topAssister
          ? {
              ea_persona_name: topAssister.ea_persona_name,
              team_name: topAssister.team_name,
              assists: topAssister.assists,
            }
          : null,
      });
    }

    return entries;
  }

  private formatSeasonLabel(start: Date, end: Date): string {
    const ys = start.getFullYear();
    const ye = end.getFullYear();
    if (ys === ye) {
      return `Saison ${ye}`;
    }
    return `${ys} – ${ye}`;
  }

  private resolveChampion(
    competition: {
      type: string;
      teams: { team: { id: string; name: string; logo_url: string | null } }[];
      matches: Array<{
        status: string;
        round: string | null;
        home_score: number | null;
        away_score: number | null;
        home_team_id: string;
        away_team_id: string;
        homeTeam: HallOfFameTeam;
        awayTeam: HallOfFameTeam;
      }>;
    },
  ): HallOfFameTeam | null {
    const played = competition.matches.filter((m) => m.status === 'PLAYED');
    if (played.length === 0) {
      return null;
    }

    if (competition.type === 'LEAGUE') {
      const teams = competition.teams.map((ct) => ct.team);
      const standings = computeStandings(teams, played);
      return standings[0]?.team ?? null;
    }

    const winnerOf = (
      m: (typeof played)[0],
    ): HallOfFameTeam => {
      const hs = m.home_score ?? 0;
      const as = m.away_score ?? 0;
      if (hs > as) return m.homeTeam;
      if (as > hs) return m.awayTeam;
      return m.homeTeam;
    };

    const finale = played.find((m) => m.round === 'Finale');
    if (finale) {
      return winnerOf(finale);
    }

    for (let i = CUP_ROUND_ORDER.length - 1; i >= 0; i--) {
      const roundName = CUP_ROUND_ORDER[i];
      const ms = played.filter((m) => m.round === roundName);
      if (ms.length >= 1) {
        return winnerOf(ms[0]);
      }
    }

    return winnerOf(played[played.length - 1]);
  }
}
