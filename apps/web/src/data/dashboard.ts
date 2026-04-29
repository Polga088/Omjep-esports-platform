export interface KpiItem {
  id: string
  label: string
  value: string
  trend: string
  progress: number
}

export type MatchStatus = 'LIVE' | 'UPCOMING' | 'FINISHED'

export interface MatchItem {
  id: string
  competition: string
  stage: string
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  kickoff: string
  venue: string
  status: MatchStatus
}

export interface LeaderboardEntry {
  id: string
  rank: number
  gamertag: string
  club: string
  points: number
  winRate: number
  goalsFor: number
  goalsAgainst: number
  form: Array<'W' | 'L' | 'D'>
}

export interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: string
  type: 'match' | 'ranking' | 'transfer' | 'community'
}

export interface AchievementItem {
  id: string
  label: string
}

export interface PlayerMatchItem {
  id: string
  opponent: string
  score: string
  result: 'W' | 'L' | 'D'
  competition: string
}

export interface PlayerProfileData {
  avatarUrl: string
  gamertag: string
  fullName: string
  club: string
  nationalRank: number
  points: number
  winRate: number
  goalsScored: number
  goalsConceded: number
  recentForm: Array<'W' | 'L' | 'D'>
  lastMatches: PlayerMatchItem[]
  achievements: AchievementItem[]
}

export interface TournamentItem {
  id: string
  name: string
  season: string
  participants: number
  status: 'Ouvert' | 'En cours' | 'Clôturé'
}

export interface DashboardContent {
  hero: {
    badge: string
    title: string
    subtitle: string
    description: string
  }
  kpis: KpiItem[]
  matches: MatchItem[]
  leaderboard: LeaderboardEntry[]
  activity: ActivityItem[]
  tournaments: TournamentItem[]
  playerProfile: PlayerProfileData
}

export const dashboardContent: DashboardContent = {
  hero: {
    badge: 'Plateforme officielle OMJEP',
    title: 'Dashboard Compétition EA FC',
    subtitle: 'Organisation Marocaine des Jeux Électroniques Professionnels',
    description:
      'Pilotez la saison nationale EA FC avec une vue institutionnelle premium : performances, classement, rencontres et progression des joueurs professionnels.',
  },
  kpis: [
    {
      id: 'active-players',
      label: 'Joueurs professionnels actifs',
      value: '128',
      trend: '+12 ce mois',
      progress: 78,
    },
    {
      id: 'official-matches',
      label: 'Matchs officiels disputés',
      value: '942',
      trend: '+34 cette semaine',
      progress: 86,
    },
    {
      id: 'live-competitions',
      label: 'Compétitions en cours',
      value: '6',
      trend: '2 finales à venir',
      progress: 64,
    },
    {
      id: 'community-engagement',
      label: 'Engagement communauté',
      value: '91%',
      trend: '+4.3% vs trimestre précédent',
      progress: 91,
    },
  ],
  matches: [
    {
      id: 'm1',
      competition: 'Ligue Elite OMJEP EA FC 26',
      stage: 'Journée 12',
      homeTeam: 'Rabat Falcons',
      awayTeam: 'Casablanca Titans',
      homeScore: 2,
      awayScore: 1,
      kickoff: 'En direct',
      venue: 'OMJEP Arena',
      status: 'LIVE',
    },
    {
      id: 'm2',
      competition: 'Coupe du Trône eFootball',
      stage: 'Demi-finale',
      homeTeam: 'Marrakech Atlas',
      awayTeam: 'Tangier Storm',
      kickoff: 'Ce soir • 21:00',
      venue: 'Arena digitale nationale',
      status: 'UPCOMING',
    },
    {
      id: 'm3',
      competition: 'Masters National EA FC',
      stage: 'Quarts de finale',
      homeTeam: 'Agadir Pulse',
      awayTeam: 'Fes Phoenix',
      homeScore: 3,
      awayScore: 3,
      kickoff: 'Terminé',
      venue: 'Studio OMJEP',
      status: 'FINISHED',
    },
  ],
  leaderboard: [
    {
      id: 'p1',
      rank: 1,
      gamertag: 'OMJEP_Nova',
      club: 'Rabat Falcons',
      points: 2480,
      winRate: 73.2,
      goalsFor: 98,
      goalsAgainst: 34,
      form: ['W', 'W', 'D', 'W', 'W'],
    },
    {
      id: 'p2',
      rank: 2,
      gamertag: 'Atlas_7',
      club: 'Marrakech Atlas',
      points: 2395,
      winRate: 69.8,
      goalsFor: 91,
      goalsAgainst: 39,
      form: ['W', 'L', 'W', 'W', 'D'],
    },
    {
      id: 'p3',
      rank: 3,
      gamertag: 'CasaPrime',
      club: 'Casablanca Titans',
      points: 2330,
      winRate: 66.5,
      goalsFor: 86,
      goalsAgainst: 44,
      form: ['D', 'W', 'W', 'L', 'W'],
    },
    {
      id: 'p4',
      rank: 4,
      gamertag: 'FennecPro',
      club: 'Fes Phoenix',
      points: 2258,
      winRate: 64.1,
      goalsFor: 82,
      goalsAgainst: 48,
      form: ['W', 'D', 'L', 'W', 'W'],
    },
  ],
  activity: [
    {
      id: 'a1',
      title: 'Mise à jour du ranking national',
      description: 'Le classement officiel a été validé après la Journée 12',
      timestamp: 'Il y a 30 min',
      type: 'ranking',
    },
    {
      id: 'a2',
      title: 'Résultat homologué',
      description: 'Rabat Falcons 2 - 1 Casablanca Titans',
      timestamp: 'Il y a 1 h',
      type: 'match',
    },
    {
      id: 'a3',
      title: 'Transfert validé',
      description: 'Atlas_7 rejoint Marrakech Atlas pour la phase retour',
      timestamp: 'Il y a 2 h',
      type: 'transfer',
    },
    {
      id: 'a4',
      title: 'Annonce communauté',
      description: 'Ouverture des inscriptions pour les qualifiers U23',
      timestamp: 'Aujourd’hui',
      type: 'community',
    },
  ],
  tournaments: [
    { id: 't1', name: 'Ligue Elite OMJEP', season: 'Saison 2026', participants: 20, status: 'En cours' },
    { id: 't2', name: 'Coupe du Trône eFootball', season: 'Saison 2026', participants: 32, status: 'En cours' },
    { id: 't3', name: 'Masters National EA FC', season: 'Saison 2026', participants: 16, status: 'Ouvert' },
  ],
  playerProfile: {
    avatarUrl:
      'https://images.unsplash.com/photo-1626585489888-0c0f4f63a7ec?auto=format&fit=crop&w=600&q=80',
    gamertag: 'OMJEP_Nova',
    fullName: 'Noureddine El Amrani',
    club: 'Rabat Falcons',
    nationalRank: 1,
    points: 2480,
    winRate: 73.2,
    goalsScored: 98,
    goalsConceded: 34,
    recentForm: ['W', 'W', 'D', 'W', 'W'],
    lastMatches: [
      { id: 'lm1', opponent: 'CasaPrime', score: '3 - 1', result: 'W', competition: 'Ligue Elite' },
      { id: 'lm2', opponent: 'FennecPro', score: '2 - 2', result: 'D', competition: 'Masters National' },
      { id: 'lm3', opponent: 'Atlas_7', score: '1 - 0', result: 'W', competition: 'Coupe du Trône' },
    ],
    achievements: [
      { id: 'ach1', label: 'Champion national 2025' },
      { id: 'ach2', label: 'MVP Ligue Elite (x2)' },
      { id: 'ach3', label: 'Meilleure attaque saison 2026' },
    ],
  },
}
