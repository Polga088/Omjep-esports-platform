/**
 * Ligne agrégée pour le classement des joueurs (Golden Boot / stats combinées)
 * dans le cadre d’une compétition donnée.
 */
export interface TopPlayerRow {
  ea_persona_name: string;
  team_name: string;
  goals: number;
  assists: number;
  matches_played: number;
  /** (goals * 2 + assists) / matches_played — 0 si aucun match joué */
  average_rating: number;
}

/** Entrée pour les tops buteurs / passeurs (endpoint top-stats). */
export interface TopStatEntry {
  player: { id: string; ea_persona_name: string | null };
  team: { id: string; name: string; logo_url: string | null };
  count: number;
}

export interface TopStatsResponse {
  topScorers: TopStatEntry[];
  topAssisters: TopStatEntry[];
}

export interface HallOfFameTeam {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface HallOfFameEntry {
  competition: {
    id: string;
    name: string;
    type: string;
    start_date: string;
    end_date: string;
  };
  /** Libellé saison / année pour l’affichage */
  seasonLabel: string;
  champion: HallOfFameTeam | null;
  goldenBoot: {
    ea_persona_name: string;
    team_name: string;
    goals: number;
  } | null;
  topAssister: {
    ea_persona_name: string;
    team_name: string;
    assists: number;
  } | null;
}
