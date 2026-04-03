/**
 * Classement intra-groupe (mêmes règles que CompetitionsService.computeStandings).
 */
export interface StandingTeam {
  id: string;
  name: string;
}

export interface GroupStandingRow {
  rank: number;
  team: StandingTeam;
  points: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
}

type PlayedMatch = {
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
};

export function computeGroupStandings(
  teams: StandingTeam[],
  playedMatches: PlayedMatch[],
): GroupStandingRow[] {
  const map = new Map<
    string,
    {
      team: StandingTeam;
      points: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
    }
  >();

  for (const t of teams) {
    map.set(t.id, {
      team: t,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  }

  for (const m of playedMatches) {
    const hs = m.home_score ?? 0;
    const as = m.away_score ?? 0;
    const home = map.get(m.home_team_id);
    const away = map.get(m.away_team_id);
    if (home) {
      home.played++;
      home.goalsFor += hs;
      home.goalsAgainst += as;
    }
    if (away) {
      away.played++;
      away.goalsFor += as;
      away.goalsAgainst += hs;
    }
    if (hs > as) {
      if (home) {
        home.won++;
        home.points += 3;
      }
      if (away) away.lost++;
    } else if (hs < as) {
      if (away) {
        away.won++;
        away.points += 3;
      }
      if (home) home.lost++;
    } else {
      if (home) {
        home.drawn++;
        home.points += 1;
      }
      if (away) {
        away.drawn++;
        away.points += 1;
      }
    }
  }

  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    diff: r.goalsFor - r.goalsAgainst,
  }));
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.diff - a.diff ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name),
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    team: r.team,
    points: r.points,
    played: r.played,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    diff: r.diff,
  }));
}

/** Ex. "Groupe A" → "A" */
export function parseGroupLetter(round: string | null | undefined): string {
  if (!round?.trim()) return '';
  const m = round.trim().match(/Groupe\s+([A-Z])/i);
  return m ? m[1].toUpperCase() : '';
}

export function isGroupPhaseRound(round: string | null | undefined): boolean {
  return Boolean(round?.trim().startsWith('Groupe '));
}

/**
 * Croisements type UEFA : 1er du groupe i vs 2e du groupe (i+1) mod G.
 */
export function buildCrossGroupPairings(
  groups: {
    letter: string;
    first: StandingTeam;
    second: StandingTeam;
  }[],
): { home: StandingTeam; away: StandingTeam; label: string }[] {
  const G = groups.length;
  const out: { home: StandingTeam; away: StandingTeam; label: string }[] = [];
  for (let i = 0; i < G; i++) {
    const next = (i + 1) % G;
    const gHome = groups[i].letter;
    const gAway = groups[next].letter;
    out.push({
      home: groups[i].first,
      away: groups[next].second,
      label: `1${gHome} vs 2${gAway}`,
    });
  }
  return out;
}

/** 2G doit être une puissance de 2 (4, 8, 16, …). */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
