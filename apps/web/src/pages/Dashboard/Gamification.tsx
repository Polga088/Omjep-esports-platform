import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Zap, Target, Shield, Star, Flame, Crown, Award,
  TrendingUp, ChevronRight, Loader2, Swords, Users,
  Medal, Sparkles, ArrowUp, BarChart3,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import PlayerCard from '@/components/PlayerCard';
import LevelUpOverlay from '@/components/LevelUpOverlay';

// ─── Types ─────────────────────────────────────────────────

interface XpProgress {
  current: number;
  needed: number;
  percentage: number;
  nextLevel: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlocked: boolean;
  progress: number;
  target: number;
}

interface SeasonForm {
  matchId: string;
  result: 'W' | 'D' | 'L';
  goalsScored: number;
  goalsAgainst: number;
  date: string;
}

interface Milestone {
  label: string;
  xpRequired: number;
  reached: boolean;
  level: number;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  position: string | null;
  level: number;
  xp: number;
  goals: number;
  assists: number;
  matchesPlayed: number;
  averageRating: number;
  team: { id: string; name: string; logo_url: string | null } | null;
}

interface GamificationData {
  player: {
    id: string;
    name: string;
    position: string | null;
    nationality: string | null;
    level: number;
    xp: number;
    xpProgress: XpProgress;
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
  seasonForm: SeasonForm[];
  milestones: Milestone[];
  contract: {
    salary: number;
    release_clause: number;
    expires_at: string;
  } | null;
  overall: number;
}

type AchievementFilter = 'all' | 'unlocked' | 'locked';

// ─── Helpers ───────────────────────────────────────────────

const tierColors = {
  bronze: { bg: 'from-amber-800/30 to-amber-900/20', border: 'border-amber-700/40', text: 'text-amber-600', glow: 'shadow-amber-800/20' },
  silver: { bg: 'from-slate-300/20 to-slate-400/10', border: 'border-slate-400/30', text: 'text-slate-300', glow: 'shadow-slate-400/20' },
  gold: { bg: 'from-amber-400/25 to-amber-500/15', border: 'border-amber-400/40', text: 'text-amber-400', glow: 'shadow-amber-400/30' },
  diamond: { bg: 'from-cyan-400/20 to-blue-500/15', border: 'border-cyan-400/40', text: 'text-cyan-400', glow: 'shadow-cyan-400/30' },
};

const formColors = {
  W: 'bg-emerald-500 text-white',
  D: 'bg-amber-500 text-white',
  L: 'bg-red-500 text-white',
};

function formatMoney(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M €`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K €`;
  return `${v.toLocaleString('fr-FR')} €`;
}

// ─── SVG Radar Chart ───────────────────────────────────────

function StatsRadar({ stats }: { stats: GamificationData['stats'] }) {
  const labels = ['Buts', 'Passes D.', 'Matchs', 'C. Sheets', 'MotM', 'Note'];
  const maxValues = [30, 30, 50, 15, 10, 10];
  const values = [
    stats.goals,
    stats.assists,
    stats.matches,
    stats.cleanSheets,
    stats.motm,
    stats.averageRating,
  ];
  const normalized = values.map((v, i) => Math.min(v / maxValues[i], 1));

  const cx = 120;
  const cy = 120;
  const r = 90;
  const levels = 4;
  const angleStep = (2 * Math.PI) / labels.length;

  const getPoint = (index: number, value: number) => ({
    x: cx + r * value * Math.sin(index * angleStep),
    y: cy - r * value * Math.cos(index * angleStep),
  });

  const dataPoints = normalized.map((v, i) => getPoint(i, v));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" className="w-full max-w-[280px]">
        {/* Grid levels */}
        {Array.from({ length: levels }, (_, lvl) => {
          const scale = (lvl + 1) / levels;
          const points = labels
            .map((_, i) => getPoint(i, scale))
            .map((p) => `${p.x},${p.y}`)
            .join(' ');
          return (
            <polygon
              key={lvl}
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Axis lines */}
        {labels.map((_, i) => {
          const end = getPoint(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Data polygon */}
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(251,191,36,0.15)"
          stroke="#fbbf24"
          strokeWidth="1.5"
        />

        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#fbbf24"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          />
        ))}

        {/* Labels */}
        {labels.map((label, i) => {
          const labelPos = getPoint(i, 1.2);
          return (
            <text
              key={i}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 text-[9px] font-semibold"
            >
              {label}
            </text>
          );
        })}

        {/* Value labels */}
        {values.map((value, i) => {
          const valPos = getPoint(i, normalized[i] > 0.3 ? normalized[i] - 0.15 : normalized[i] + 0.2);
          return (
            <text
              key={`v-${i}`}
              x={valPos.x}
              y={valPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-amber-400 text-[8px] font-bold"
            >
              {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── XP Milestone Timeline ─────────────────────────────────

function MilestoneTimeline({ milestones, currentXp }: { milestones: Milestone[]; currentXp: number }) {
  const maxXp = milestones[milestones.length - 1]?.xpRequired ?? 1;
  const progress = Math.min((currentXp / maxXp) * 100, 100);

  return (
    <div className="relative">
      {/* Track */}
      <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #B8860B 0%, #FFD700 50%, #FFF8DC 100%)',
            boxShadow: '0 0 12px rgba(255,215,0,0.4)',
          }}
        />
      </div>

      {/* Milestone markers */}
      <div className="relative mt-3 flex justify-between px-1">
        {milestones.map((m) => {
          const position = (m.xpRequired / maxXp) * 100;
          return (
            <div
              key={m.level}
              className="flex flex-col items-center"
              style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  m.reached
                    ? 'bg-amber-400 border-amber-400 shadow-lg shadow-amber-400/40'
                    : 'bg-transparent border-slate-600'
                }`}
              />
              <span className={`text-[9px] mt-1 font-bold ${m.reached ? 'text-amber-400' : 'text-slate-600'}`}>
                {m.level}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Achievement Badge ─────────────────────────────────────

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const colors = tierColors[achievement.tier];
  const progressPercent = (achievement.progress / achievement.target) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-4 transition-all duration-300 hover:scale-[1.03] ${
        achievement.unlocked ? `shadow-lg ${colors.glow}` : 'opacity-60 grayscale-[30%]'
      }`}
    >
      {achievement.unlocked && (
        <div className="absolute top-2 right-2">
          <Sparkles className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
      )}

      <div className="text-center">
        <span className="text-2xl block mb-2">{achievement.icon}</span>
        <h4 className="text-xs font-bold text-white truncate">{achievement.name}</h4>
        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{achievement.description}</p>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`h-full rounded-full ${
              achievement.unlocked
                ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                : 'bg-slate-500'
            }`}
          />
        </div>
        <p className={`text-[9px] font-bold mt-1 text-center tabular-nums ${
          achievement.unlocked ? colors.text : 'text-slate-600'
        }`}>
          {achievement.progress}/{achievement.target}
        </p>
      </div>

      {/* Tier label */}
      <div className={`mt-2 text-center text-[8px] font-bold uppercase tracking-widest ${colors.text}`}>
        {achievement.tier}
      </div>
    </motion.div>
  );
}

// ─── Leaderboard Row ───────────────────────────────────────

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const rankColors: Record<number, string> = {
    1: 'from-amber-400 to-amber-600 text-amber-900',
    2: 'from-slate-300 to-slate-400 text-slate-800',
    3: 'from-amber-700 to-amber-800 text-amber-200',
  };

  return (
    <Link
      to={`/dashboard/profile/${entry.id}`}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isMe
          ? 'bg-amber-400/10 border border-amber-400/20'
          : 'hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        {entry.rank <= 3 ? (
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${rankColors[entry.rank]} flex items-center justify-center text-xs font-black mx-auto`}>
            {entry.rank}
          </div>
        ) : (
          <span className="text-sm font-bold text-slate-500 tabular-nums">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400/15 to-amber-600/10 border border-white/10 flex items-center justify-center text-xs font-bold text-amber-400 uppercase shrink-0">
        {entry.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold truncate ${isMe ? 'text-amber-400' : 'text-white group-hover:text-amber-300'} transition-colors`}>
            {entry.name}
          </span>
          {isMe && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500/70 px-1.5 py-0.5 rounded bg-amber-500/10">
              Vous
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {entry.team && <span>{entry.team.name}</span>}
          {entry.position && <span>• {entry.position}</span>}
        </div>
      </div>

      {/* Level badge */}
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex flex-col items-center justify-center shrink-0 border border-amber-400/30">
        <span className="text-[7px] font-bold uppercase text-amber-900/70">Niv</span>
        <span className="text-sm font-black text-white leading-none tabular-nums">{entry.level}</span>
      </div>

      {/* XP */}
      <div className="text-right shrink-0 w-16">
        <p className="text-xs font-black text-amber-400 tabular-nums">{entry.xp.toLocaleString('fr-FR')}</p>
        <p className="text-[9px] text-slate-600">XP</p>
      </div>
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function Gamification() {
  const { user } = useAuthStore();
  const [data, setData] = useState<GamificationData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<AchievementFilter>('all');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [profileRes, lbRes] = await Promise.all([
          api.get<GamificationData>('/gamification/profile'),
          api.get<LeaderboardEntry[]>('/gamification/leaderboard'),
        ]);

        if (!cancelled) {
          const profile = profileRes.data;

          if (prevLevelRef.current !== null && profile.player.level > prevLevelRef.current) {
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 4000);
          }
          prevLevelRef.current = profile.player.level;

          setData(profile);
          setLeaderboard(lbRes.data);
        }
      } catch {
        if (!cancelled) setError('Impossible de charger les données de gamification.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const filteredAchievements = data?.achievements.filter((a) => {
    if (achievementFilter === 'unlocked') return a.unlocked;
    if (achievementFilter === 'locked') return !a.unlocked;
    return true;
  }) ?? [];

  const unlockedCount = data?.achievements.filter((a) => a.unlocked).length ?? 0;
  const totalAchievements = data?.achievements.length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          <p className="text-sm text-slate-500">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 pb-8">
      <LevelUpOverlay
        active={showLevelUp}
        newLevel={data.player.level}
        onDone={() => setShowLevelUp(false)}
      />

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="relative rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/5 via-transparent to-transparent p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-amber-400/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-amber-600/5 blur-[80px] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-400/20 border border-amber-400/30">
            <Trophy className="w-7 h-7 text-[#0A0E1A]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white tracking-tight">Mon Parcours</h1>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400/60 px-2 py-1 rounded-full bg-amber-400/10 border border-amber-400/15">
                Saison 1
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Progression, Achievements et Classement — {data.player.name}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════ TOP GRID: Card + XP + Ranking ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Player Card */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="transition-transform duration-300 ease-out hover:rotate-2 hover:scale-105" style={{ perspective: '800px' }}>
            <PlayerCard
              rating={data.overall}
              position={data.player.position ?? '??'}
              name={data.player.name}
              goals={data.stats.goals}
              assists={data.stats.assists}
              appearances={data.stats.matches}
              nationality={data.player.nationality ?? undefined}
              clubName={data.team?.name}
              clubLogoUrl={data.team?.logo_url}
              marketValue={data.contract?.release_clause}
              level={data.player.level}
              xp={data.player.xp}
            />
          </div>
        </div>

        {/* XP + Level + Milestones */}
        <div className="lg:col-span-5 space-y-5">
          {/* Level + XP Hero */}
          <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-[#0D1221] to-[#111827] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">Progression XP</h3>
              </div>
              <span className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">
                {data.player.xp.toLocaleString('fr-FR')} XP Total
              </span>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Level badge + progress */}
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 0px rgba(255,215,0,0)',
                      '0 0 15px rgba(255,215,0,0.3)',
                      '0 0 0px rgba(255,215,0,0)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="relative shrink-0"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900/70">Niv.</span>
                    <span className="text-3xl font-black text-white leading-none tabular-nums" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                      {data.player.level}
                    </span>
                  </div>
                </motion.div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      {data.player.xpProgress.current.toLocaleString('fr-FR')} / {data.player.xpProgress.needed.toLocaleString('fr-FR')} XP
                    </span>
                    <span className="text-xs font-bold text-amber-400">→ Niv. {data.player.xpProgress.nextLevel}</span>
                  </div>

                  {/* Main progress bar */}
                  <div className="relative h-3 rounded-full bg-white/5 overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.player.xpProgress.percentage}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #B8860B 0%, #FFD700 50%, #FFF8DC 100%)',
                        boxShadow: '0 0 16px rgba(255,215,0,0.5)',
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-600">
                    Encore <span className="text-amber-400/80 font-semibold">
                      {(data.player.xpProgress.needed - data.player.xpProgress.current).toLocaleString('fr-FR')} XP
                    </span> pour le niveau suivant
                  </p>
                </div>
              </div>

              {/* XP Gain sources */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Par match', value: '+50 XP', icon: Swords, color: 'text-blue-400' },
                  { label: 'Par but', value: '+25 XP', icon: Target, color: 'text-red-400' },
                  { label: 'Par passe D.', value: '+15 XP', icon: Zap, color: 'text-emerald-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                    <div>
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className={`text-xs font-bold ${color}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Milestone Timeline */}
          <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Jalons de Carrière</h3>
            </div>
            <MilestoneTimeline milestones={data.milestones} currentXp={data.player.xp} />
          </div>
        </div>

        {/* Ranking + Season Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Rank Card */}
          <div className="rounded-2xl border border-amber-400/15 bg-gradient-to-b from-amber-400/5 to-transparent p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Classement Global</h3>
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="mb-3"
            >
              <div className="inline-flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 shadow-lg shadow-amber-500/30 border border-amber-400/40">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900/70">Rang</span>
                <span className="text-4xl font-black text-white leading-none tabular-nums" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {data.ranking.position}
                </span>
              </div>
            </motion.div>

            <p className="text-xs text-slate-500">
              sur <span className="text-white font-semibold">{data.ranking.totalPlayers}</span> joueurs
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ArrowUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">
                Top {data.ranking.topPercentage}%
              </span>
            </div>
          </div>

          {/* Season Form */}
          <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Forme Récente</h3>
            </div>

            {data.seasonForm.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-6">Aucun match récent</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center mb-3">
                  {data.seasonForm.map((f) => (
                    <div
                      key={f.matchId}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${formColors[f.result]}`}
                    >
                      {f.result}
                    </div>
                  ))}
                </div>
                {data.seasonForm.map((f) => (
                  <div key={f.matchId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black ${formColors[f.result]}`}>
                      {f.result}
                    </div>
                    <span className="text-xs text-white font-semibold tabular-nums">
                      {f.goalsScored} - {f.goalsAgainst}
                    </span>
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {new Date(f.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contract info */}
          {data.contract && (
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Contrat</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Salaire</span>
                  <span className="font-bold text-emerald-400">{formatMoney(data.contract.salary)}/sem</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Clause libératoire</span>
                  <span className="font-bold text-amber-400">{formatMoney(data.contract.release_clause)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Expire le</span>
                  <span className="font-semibold text-white">
                    {new Date(data.contract.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ STATS RADAR + QUICK STATS ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Profil de Performance</h2>
          </div>
          <div className="p-6">
            <StatsRadar stats={data.stats} />
          </div>
        </div>

        {/* Stat cards grid */}
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Statistiques Détaillées</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            {[
              { label: 'Buts', value: data.stats.goals, sub: `${data.stats.goalsPerGame.toFixed(2)}/match`, icon: Swords, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
              { label: 'Passes D.', value: data.stats.assists, sub: `${data.stats.assistsPerGame.toFixed(2)}/match`, icon: Star, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { label: 'Matchs', value: data.stats.matches, sub: 'disputés', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              { label: 'Clean Sheets', value: data.stats.cleanSheets, sub: 'cage inviolée', icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
              { label: 'MOTM', value: data.stats.motm, sub: 'Homme du Match', icon: Medal, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              { label: 'Note Moy.', value: data.stats.averageRating.toFixed(1), sub: 'AMR', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
            ].map(({ label, value, sub, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-xl border ${border} ${bg} p-4 transition-all duration-200 hover:scale-[1.02]`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
                </div>
                <p className={`text-2xl font-black ${color} tabular-nums`}>{value}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════ ACHIEVEMENTS ═══════════════════ */}
      <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Achievements</h2>
            <span className="ml-2 text-xs font-bold text-amber-400/60 bg-amber-400/10 px-2 py-0.5 rounded-full">
              {unlockedCount}/{totalAchievements}
            </span>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/5">
            {([
              { key: 'all' as const, label: 'Tous' },
              { key: 'unlocked' as const, label: 'Débloqués' },
              { key: 'locked' as const, label: 'Verrouillés' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAchievementFilter(key)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  achievementFilter === key
                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20'
                    : 'text-slate-500 hover:text-white border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Achievement progress overview */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-slate-500">Progression globale</span>
              <span className="text-xs font-bold text-amber-400">
                {totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
              />
            </div>
          </div>

          {/* Badges grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={achievementFilter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            >
              {filteredAchievements.map((a) => (
                <AchievementBadge key={a.id} achievement={a} />
              ))}
              {filteredAchievements.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-sm text-slate-600">Aucun achievement dans cette catégorie</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════════════ LEADERBOARD ═══════════════════ */}
      <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Classement XP</h2>
          </div>
          <Link
            to="/dashboard/ladder"
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400/60 hover:text-amber-400 transition-colors"
          >
            Voir tout
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-4 space-y-1">
          {leaderboard.slice(0, 10).map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} isMe={entry.id === user?.id} />
          ))}
          {leaderboard.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-8">Aucun joueur dans le classement</p>
          )}
        </div>
      </div>

      {/* ═══════════════════ QUICK ACTIONS ═══════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Ma Carte', desc: 'Voir et partager votre carte joueur', to: `/dashboard/profile/${data.player.id}`, icon: Award },
          { label: 'Mercato Live', desc: 'Explorer les offres de transfert', to: '/dashboard/transfers', icon: Flame },
          { label: 'Mon Équipe', desc: 'Voir le roster et la tactique', to: '/dashboard/team', icon: Users },
        ].map(({ label, desc, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-400/20 transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-amber-400/10 group-hover:border-amber-400/20 transition-all">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">{label}</p>
                <p className="text-xs text-slate-500 truncate">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400/60 shrink-0 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
