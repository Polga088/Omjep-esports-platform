export type LeagueScheduleInput = {
  match_weekdays: number[];
  matches_per_day: number;
  slot_gap_minutes: number;
  anchor_date: Date;
  first_kickoff_time: string;
};

/** Avance `date` (modifiée in-place) jusqu’au prochain jour dont getDay() est dans `allowed`. */
function advanceToAllowedWeekday(date: Date, allowed: Set<number>): void {
  let guard = 0;
  while (!allowed.has(date.getDay()) && guard++ < 400) {
    date.setDate(date.getDate() + 1);
  }
  if (guard >= 400) {
    throw new Error('Impossible de placer les matchs : jours de semaine invalides ou trop de matchs.');
  }
}

function parseHm(s: string): { h: number; m: number } {
  const [a, b] = s.split(':').map((x) => Number.parseInt(x, 10));
  return { h: a, m: b };
}

/**
 * Attribue un `startTime` à chaque match, dans l’ordre fourni (ex. ordre des journées généré).
 */
export function assignLeagueKickoffs<T extends object>(
  matches: T[],
  input: LeagueScheduleInput,
): (T & { startTime: Date })[] {
  const allowed = new Set(input.match_weekdays);
  if (allowed.size === 0) {
    throw new Error('match_weekdays ne peut pas être vide.');
  }

  const perDay = input.matches_per_day;
  const gapMin = input.slot_gap_minutes;
  if ((perDay - 1) * gapMin >= 24 * 60) {
    throw new Error(
      'Les créneaux dépassent 24h : réduisez matches_per_day ou slot_gap_minutes.',
    );
  }

  const { h: baseH, m: baseM } = parseHm(input.first_kickoff_time);

  const cursor = new Date(input.anchor_date);
  cursor.setHours(0, 0, 0, 0);
  advanceToAllowedWeekday(cursor, allowed);

  let slotsOnDay = 0;
  const out: (T & { startTime: Date })[] = [];

  for (const m of matches) {
    if (slotsOnDay >= perDay) {
      cursor.setDate(cursor.getDate() + 1);
      advanceToAllowedWeekday(cursor, allowed);
      slotsOnDay = 0;
    }

    const kickoff = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), baseH, baseM, 0, 0);
    kickoff.setMinutes(kickoff.getMinutes() + slotsOnDay * gapMin);

    out.push({ ...m, startTime: kickoff });
    slotsOnDay += 1;
  }

  return out;
}
