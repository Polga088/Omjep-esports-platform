import { useEffect, useState } from 'react';

const STORAGE_KEY = 'omjep-leaderboard-prev-ranks-v1';

export interface LeaderboardEntryLike {
  id: string;
  rank: number;
}

/**
 * Compare le classement courant au snapshot sessionStorage (visite précédente).
 * Valeur positive = le joueur a grimpé (rang numérique plus bas).
 */
export function useLeaderboardRankDeltas<T extends LeaderboardEntryLike>(entries: T[]): Record<string, number> {
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (entries.length === 0) {
      setDeltas({});
      return;
    }

    let prev: Record<string, number> = {};
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) prev = JSON.parse(raw) as Record<string, number>;
    } catch {
      prev = {};
    }

    const next: Record<string, number> = {};
    for (const e of entries) {
      const was = prev[e.id];
      if (typeof was === 'number' && was !== e.rank) {
        next[e.id] = was - e.rank;
      }
    }
    setDeltas(next);

    const save: Record<string, number> = {};
    for (const e of entries) save[e.id] = e.rank;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [entries]);

  return deltas;
}
