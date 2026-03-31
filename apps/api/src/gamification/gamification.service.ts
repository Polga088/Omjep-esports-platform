import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'goals' | 'assists' | 'matches' | 'level' | 'team' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlocked: boolean;
  progress: number;
  target: number;
  unlockedAt?: string;
}

export interface GamificationProfile {
  player: {
    id: string;
    name: string;
    position: string | null;
    nationality: string | null;
    level: number;
    xp: number;
    xpProgress: {
      current: number;
      needed: number;
      percentage: number;
      nextLevel: number;
    };
  };
  team: {
    id: string;
    name: string;
    logo_url: string | null;
    prestige_level: number;
    xp: number;
  } | null;
  stats: {
    goals: number;
    assists: number;
    matches: number;
    cleanSheets: number;
    motm: number;
    averageRating: number;
    goalsPerGame: number;
    assistsPerGame: number;
  };
  achievements: Achievement[];
  ranking: {
    position: number;
    totalPlayers: number;
    topPercentage: number;
  };
  seasonForm: {
    matchId: string;
    result: 'W' | 'D' | 'L';
    goalsScored: number;
    goalsAgainst: number;
    date: string;
  }[];
  milestones: {
    label: string;
    xpRequired: number;
    reached: boolean;
    level: number;
  }[];
  contract: {
    salary: number;
    release_clause: number;
    expires_at: string;
  } | null;
  overall: number;
}

const ACHIEVEMENT_DEFINITIONS = [
  // Goals
  { id: 'first_goal', name: 'Premier But', desc: 'Marquer votre premier but', icon: '⚽', category: 'goals' as const, tier: 'bronze' as const, target: 1 },
  { id: 'sharpshooter', name: 'Tireur d\'Élite', desc: 'Marquer 5 buts', icon: '🎯', category: 'goals' as const, tier: 'silver' as const, target: 5 },
  { id: 'goal_machine', name: 'Machine à Buts', desc: 'Marquer 10 buts', icon: '🔥', category: 'goals' as const, tier: 'gold' as const, target: 10 },
  { id: 'legend_striker', name: 'Buteur Légendaire', desc: 'Marquer 25 buts', icon: '👑', category: 'goals' as const, tier: 'diamond' as const, target: 25 },

  // Assists
  { id: 'first_assist', name: 'Première Passe D.', desc: 'Délivrer votre première passe décisive', icon: '🤝', category: 'assists' as const, tier: 'bronze' as const, target: 1 },
  { id: 'playmaker', name: 'Meneur de Jeu', desc: 'Délivrer 5 passes décisives', icon: '🧠', category: 'assists' as const, tier: 'silver' as const, target: 5 },
  { id: 'assist_king', name: 'Roi des Passes', desc: 'Délivrer 10 passes décisives', icon: '✨', category: 'assists' as const, tier: 'gold' as const, target: 10 },
  { id: 'vision_master', name: 'Vision du Maître', desc: 'Délivrer 25 passes décisives', icon: '💎', category: 'assists' as const, tier: 'diamond' as const, target: 25 },

  // Matches
  { id: 'debut', name: 'Débuts', desc: 'Jouer votre premier match', icon: '🏟️', category: 'matches' as const, tier: 'bronze' as const, target: 1 },
  { id: 'regular', name: 'Titulaire', desc: 'Jouer 10 matchs', icon: '⚡', category: 'matches' as const, tier: 'silver' as const, target: 10 },
  { id: 'veteran', name: 'Vétéran', desc: 'Jouer 25 matchs', icon: '🛡️', category: 'matches' as const, tier: 'gold' as const, target: 25 },
  { id: 'centurion', name: 'Centurion', desc: 'Jouer 50 matchs', icon: '🏅', category: 'matches' as const, tier: 'diamond' as const, target: 50 },

  // Level
  { id: 'rising_star', name: 'Étoile Montante', desc: 'Atteindre le niveau 3', icon: '⭐', category: 'level' as const, tier: 'bronze' as const, target: 3 },
  { id: 'established', name: 'Joueur Confirmé', desc: 'Atteindre le niveau 5', icon: '🌟', category: 'level' as const, tier: 'silver' as const, target: 5 },
  { id: 'elite_player', name: 'Joueur d\'Élite', desc: 'Atteindre le niveau 10', icon: '💫', category: 'level' as const, tier: 'gold' as const, target: 10 },
  { id: 'living_legend', name: 'Légende Vivante', desc: 'Atteindre le niveau 20', icon: '🏆', category: 'level' as const, tier: 'diamond' as const, target: 20 },

  // Special
  { id: 'motm_first', name: 'Homme du Match', desc: 'Être élu Homme du Match', icon: '🥇', category: 'special' as const, tier: 'silver' as const, target: 1 },
  { id: 'motm_collector', name: 'Collectionneur de Trophées', desc: '5 fois Homme du Match', icon: '🏆', category: 'special' as const, tier: 'gold' as const, target: 5 },
  { id: 'clean_sheet_hero', name: 'Mur Infranchissable', desc: '5 clean sheets', icon: '🧤', category: 'special' as const, tier: 'gold' as const, target: 5 },
];

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  private xpForLevel(level: number): number {
    return (level - 1) ** 2 * 100;
  }

  private xpProgress(xp: number, level: number) {
    const currentThreshold = this.xpForLevel(level);
    const nextThreshold = this.xpForLevel(level + 1);
    const needed = nextThreshold - currentThreshold;
    const earned = xp - currentThreshold;
    return {
      current: earned,
      needed,
      nextLevel: level + 1,
      percentage: needed > 0 ? Math.min((earned / needed) * 100, 100) : 0,
    };
  }

  private computeOverall(stats: { goals: number; assists: number; matches: number; averageRating: number }): number {
    if (stats.matches === 0) return 50;
    const goalsPerGame = stats.goals / Math.max(stats.matches, 1);
    const assistsPerGame = stats.assists / Math.max(stats.matches, 1);
    const base = stats.averageRating * 8;
    const bonus = Math.min((goalsPerGame + assistsPerGame * 0.6) * 3, 20);
    return Math.min(99, Math.max(40, Math.round(base + bonus)));
  }

  private computeAchievements(stats: {
    goals: number;
    assists: number;
    matches: number;
    cleanSheets: number;
    motm: number;
    level: number;
  }): Achievement[] {
    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      let progress: number;
      switch (def.category) {
        case 'goals':
          progress = stats.goals;
          break;
        case 'assists':
          progress = stats.assists;
          break;
        case 'matches':
          progress = stats.matches;
          break;
        case 'level':
          progress = stats.level;
          break;
        case 'special':
          if (def.id.startsWith('motm')) progress = stats.motm;
          else if (def.id === 'clean_sheet_hero') progress = stats.cleanSheets;
          else progress = 0;
          break;
        default:
          progress = 0;
      }

      return {
        id: def.id,
        name: def.name,
        description: def.desc,
        icon: def.icon,
        category: def.category,
        tier: def.tier,
        unlocked: progress >= def.target,
        progress: Math.min(progress, def.target),
        target: def.target,
      };
    });
  }

  async getGamificationProfile(userId: string): Promise<GamificationProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        ea_persona_name: true,
        preferred_position: true,
        nationality: true,
        level: true,
        xp: true,
        stats: true,
      },
    });

    const membership = await this.prisma.teamMember.findFirst({
      where: { user_id: userId },
      orderBy: { joined_at: 'desc' },
      include: { team: true },
    });

    const teamIds = (
      await this.prisma.teamMember.findMany({
        where: { user_id: userId },
        select: { team_id: true },
      })
    ).map((m) => m.team_id);

    const [goals, assists, matchCount] = await Promise.all([
      this.prisma.matchEvent.count({ where: { player_id: userId, type: 'GOAL' } }),
      this.prisma.matchEvent.count({ where: { player_id: userId, type: 'ASSIST' } }),
      teamIds.length > 0
        ? this.prisma.match.count({
            where: {
              status: { in: ['PLAYED', 'FINISHED'] },
              OR: [
                { home_team_id: { in: teamIds } },
                { away_team_id: { in: teamIds } },
              ],
            },
          })
        : Promise.resolve(0),
    ]);

    const cleanSheets = user.stats?.clean_sheets ?? 0;
    const motm = user.stats?.motm ?? 0;
    const averageRating = user.stats?.average_rating ?? 0;

    const stats = {
      goals,
      assists,
      matches: matchCount,
      cleanSheets,
      motm,
      averageRating,
      goalsPerGame: matchCount > 0 ? goals / matchCount : 0,
      assistsPerGame: matchCount > 0 ? assists / matchCount : 0,
    };

    const achievements = this.computeAchievements({
      ...stats,
      level: user.level,
    });

    // Ranking: players ordered by XP desc
    const allPlayersXp = await this.prisma.user.findMany({
      where: { role: 'PLAYER' },
      select: { id: true, xp: true },
      orderBy: { xp: 'desc' },
    });
    const rankIndex = allPlayersXp.findIndex((p) => p.id === userId);
    const position = rankIndex >= 0 ? rankIndex + 1 : allPlayersXp.length;
    const totalPlayers = allPlayersXp.length;

    // Season form: last 5 matches
    const recentMatches = teamIds.length > 0
      ? await this.prisma.match.findMany({
          where: {
            status: { in: ['PLAYED', 'FINISHED'] },
            OR: [
              { home_team_id: { in: teamIds } },
              { away_team_id: { in: teamIds } },
            ],
          },
          orderBy: { played_at: 'desc' },
          take: 5,
          select: {
            id: true,
            home_team_id: true,
            away_team_id: true,
            home_score: true,
            away_score: true,
            played_at: true,
          },
        })
      : [];

    const seasonForm = recentMatches.map((m) => {
      const isHome = teamIds.includes(m.home_team_id);
      const ownScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
      const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
      let result: 'W' | 'D' | 'L';
      if (ownScore > oppScore) result = 'W';
      else if (ownScore === oppScore) result = 'D';
      else result = 'L';
      return {
        matchId: m.id,
        result,
        goalsScored: ownScore,
        goalsAgainst: oppScore,
        date: m.played_at?.toISOString() ?? new Date().toISOString(),
      };
    });

    // Milestones (level checkpoints)
    const milestones = [2, 3, 5, 7, 10, 15, 20, 25, 30].map((lvl) => ({
      label: `Niveau ${lvl}`,
      xpRequired: this.xpForLevel(lvl),
      reached: user.level >= lvl,
      level: lvl,
    }));

    const contract = await this.prisma.contract.findFirst({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      select: { salary: true, release_clause: true, expires_at: true },
    });

    return {
      player: {
        id: user.id,
        name: user.ea_persona_name ?? 'Anonyme',
        position: user.preferred_position,
        nationality: user.nationality,
        level: user.level,
        xp: user.xp,
        xpProgress: this.xpProgress(user.xp, user.level),
      },
      team: membership
        ? {
            id: membership.team.id,
            name: membership.team.name,
            logo_url: membership.team.logo_url,
            prestige_level: membership.team.prestige_level,
            xp: membership.team.xp,
          }
        : null,
      stats,
      achievements,
      ranking: {
        position,
        totalPlayers,
        topPercentage: totalPlayers > 0 ? Math.round((position / totalPlayers) * 100) : 100,
      },
      seasonForm,
      milestones,
      contract: contract
        ? {
            salary: contract.salary,
            release_clause: contract.release_clause,
            expires_at: contract.expires_at.toISOString(),
          }
        : null,
      overall: this.computeOverall(stats),
    };
  }

  async getLeaderboard(limit = 20) {
    const players = await this.prisma.user.findMany({
      where: { role: 'PLAYER' },
      orderBy: { xp: 'desc' },
      take: limit,
      select: {
        id: true,
        ea_persona_name: true,
        preferred_position: true,
        level: true,
        xp: true,
        stats: true,
        teamMemberships: {
          take: 1,
          orderBy: { joined_at: 'desc' },
          include: { team: { select: { id: true, name: true, logo_url: true } } },
        },
      },
    });

    return players.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      name: p.ea_persona_name ?? 'Anonyme',
      position: p.preferred_position,
      level: p.level,
      xp: p.xp,
      goals: p.stats?.goals ?? 0,
      assists: p.stats?.assists ?? 0,
      matchesPlayed: p.stats?.matches_played ?? 0,
      averageRating: p.stats?.average_rating ?? 0,
      team: p.teamMemberships[0]?.team ?? null,
    }));
  }
}
