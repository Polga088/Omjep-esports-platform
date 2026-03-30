import { useState, useEffect, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Star, Gamepad2, Shield, Swords, Crown, Users, Link2,
  CheckCircle2, Loader2, Wallet, ArrowUpRight, ArrowDownRight,
  FileText, TrendingUp, TrendingDown, Banknote, Trophy, Repeat, Gem, Info,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import InvitePlayerModal from '@/components/InvitePlayerModal';
import { xpProgress } from '@/lib/leveling';

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; error: Error | null }

class TeamErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MyTeam] Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Une erreur est survenue</h2>
          <p className="text-sm text-slate-400">
            L'affichage de la page équipe a rencontré un problème.
          </p>
          <p className="text-xs text-slate-600 font-mono break-all">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Types (miroir du payload Prisma) ────────────────────────────────────────

type ClubRole = 'FOUNDER' | 'MANAGER' | 'CO_MANAGER' | 'PLAYER';
type Position = 'GK' | 'DC' | 'LAT' | 'RAT' | 'MDC' | 'MOC' | 'MG' | 'MD' | 'BU' | 'ATT';

interface PlayerStats {
  matches_played: number;
  goals: number;
  assists: number;
  clean_sheets: number;
  motm: number;
  average_rating: number;
}

interface TeamMemberUser {
  id: string;
  ea_persona_name: string | null;
  preferred_position: Position | null;
  nationality: string | null;
  stats: PlayerStats | null;
}

interface TeamMember {
  user_id: string;
  club_role: ClubRole;
  joined_at: string;
  user: TeamMemberUser;
}

interface MyTeamData {
  id: string;
  name: string;
  logo_url: string | null;
  proclubs_url: string | null;
  budget?: number;
  xp?: number;
  prestige_level?: number;
  members: TeamMember[];
}

// ─── Types Finance ────────────────────────────────────────────────────────────

type TransactionType = 'MATCH_REWARD' | 'TRANSFER' | 'WAGE';

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  created_at: string;
}

interface ContractUser {
  id: string;
  ea_persona_name: string | null;
}

interface Contract {
  id: string;
  user_id: string;
  salary: number;
  release_clause: number;
  expires_at: string;
  user: ContractUser;
}

interface FinanceData {
  budget: number;
  transactions: Transaction[];
  contracts: Contract[];
}

type FinanceTab = 'roster' | 'finance';

// ─── Config visuels ──────────────────────────────────────────────────────────

const positionColors: Record<Position, string> = {
  GK:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  DC:  'bg-sky-500/15 text-sky-400 border-sky-500/30',
  LAT: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  RAT: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  MDC: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  MOC: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  MG:  'bg-teal-500/15 text-teal-400 border-teal-500/30',
  MD:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  BU:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ATT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const positionLabel: Record<Position, string> = {
  GK: 'GB', DC: 'DC', LAT: 'LAT', RAT: 'RAT',
  MDC: 'MDC', MOC: 'MOC', MG: 'MG', MD: 'MD', BU: 'BU', ATT: 'ATT',
};

const roleConfig: Record<ClubRole, { label: string; className: string; icon: React.ElementType }> = {
  FOUNDER:    { label: 'Fondateur',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: Crown },
  MANAGER:    { label: 'Manager',     className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Shield },
  CO_MANAGER: { label: 'Co-Manager',  className: 'bg-teal-500/15 text-teal-400 border-teal-500/30',       icon: Users },
  PLAYER:     { label: 'Joueur',      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: Swords },
};

// ─── Composants utilitaires ──────────────────────────────────────────────────

function RatingBar({ value }: { value: number }) {
  const percentage = (value / 10) * 100;
  const color =
    value >= 8   ? 'from-emerald-500 to-emerald-400' :
    value >= 6.5 ? 'from-blue-500 to-blue-400' :
                   'from-amber-500 to-amber-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums w-8 text-right ${
        value >= 8 ? 'text-emerald-400' : value >= 6.5 ? 'text-blue-400' : 'text-amber-400'
      }`}>
        {value > 0 ? value.toFixed(1) : 'N/A'}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 rounded-md bg-white/5 animate-pulse" style={{ width: i === 0 ? '60%' : '40%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Prestige du Club ─────────────────────────────────────────────────────────

function PrestigeSection({ xp, prestigeLevel }: { xp: number; prestigeLevel: number }) {
  const progress = xpProgress(xp, prestigeLevel);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#0D1221] to-[#0C1631] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-cyan-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">Prestige du Club</h3>
        </div>
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Info className="w-3 h-3 text-slate-500" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-7 z-50 w-64 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-xl text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-cyan-400 mb-1">Bonus de Prestige</p>
              <p>
                Le Prestige augmente à chaque victoire et performance du club.
                Plus le niveau est élevé, plus les <span className="text-white font-medium">bonus de sponsoring</span> sont importants.
              </p>
              <div className="absolute -top-1.5 right-3 w-3 h-3 bg-slate-800 border-t border-l border-slate-700 rotate-45" />
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center gap-4">
          {/* Prestige level badge */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="shrink-0"
          >
            <div
              className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-lg border border-cyan-400/20"
              style={{
                background: 'linear-gradient(135deg, #164e63 0%, #0e7490 40%, #67e8f9 100%)',
                boxShadow: '0 4px 20px rgba(6,182,212,0.2)',
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-200/70">Prstg</span>
              <span
                className="text-2xl font-black text-white leading-none tabular-nums"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                {prestigeLevel}
              </span>
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400">
                {progress.current.toLocaleString('fr-FR')} / {progress.needed.toLocaleString('fr-FR')} XP
              </span>
              <span className="text-xs font-bold text-cyan-400">
                Niv. {progress.nextLevel}
              </span>
            </div>

            {/* Progress bar - electric blue to silver */}
            <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #0e7490 0%, #22d3ee 50%, #e2e8f0 100%)',
                  boxShadow: '0 0 12px rgba(34,211,238,0.4)',
                }}
              />
            </div>

            <p className="text-[10px] text-slate-600 mt-1.5">
              <span className="text-cyan-400/80 font-semibold">{xp.toLocaleString('fr-FR')}</span> XP Club totale
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Finance config & helpers ─────────────────────────────────────────────────

const txTypeConfig: Record<TransactionType, { label: string; icon: React.ElementType; color: string }> = {
  MATCH_REWARD: { label: 'Récompense', icon: Trophy, color: 'text-emerald-400' },
  TRANSFER:     { label: 'Transfert',  icon: Repeat, color: 'text-blue-400' },
  WAGE:         { label: 'Salaire',    icon: Banknote, color: 'text-amber-400' },
};

function formatMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function MyTeam() {
  const [team, setTeam] = useState<MyTeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<FinanceTab>('roster');
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  const [externalIdInput, setExternalIdInput] = useState('');
  const [linkingClub, setLinkingClub] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState('');
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api.get<MyTeamData>('/teams/my-team')
      .then(({ data }) => {
        if (!cancelled) setTeam(data);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg: string =
            err?.response?.data?.message ??
            "Impossible de charger les données de l'équipe.";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeTab !== 'finance' || !team?.id || finance) return;
    let cancelled = false;
    setFinanceLoading(true);
    api
      .get<FinanceData>(`/finance/${team.id}`)
      .then(({ data }) => { if (!cancelled) setFinance(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFinanceLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, team?.id]);

  const players = team?.members.filter((m) => m.club_role === 'PLAYER') ?? [];
  const staff   = team?.members.filter((m) => m.club_role !== 'PLAYER') ?? [];
  const allMembers = team?.members ?? [];

  const currentMember = team?.members.find((m) => m.user_id === user?.id);
  const canRecruit = currentMember &&
    ['FOUNDER', 'MANAGER', 'CO_MANAGER'].includes(currentMember.club_role);

  const avgRating =
    allMembers.length > 0
      ? allMembers.reduce((sum, m) => sum + (m.user.stats?.average_rating ?? 0), 0) / allMembers.length
      : 0;

  const isManager = currentMember &&
    ['FOUNDER', 'MANAGER'].includes(currentMember.club_role);

  const isSynced = !!team?.proclubs_url;

  useEffect(() => {
    if (team?.proclubs_url) setExternalIdInput(team.proclubs_url);
  }, [team?.proclubs_url]);

  const handleLinkClub = async () => {
    if (!team || !externalIdInput.trim()) return;
    setLinkingClub(true);
    setLinkError('');
    setLinkSuccess('');
    try {
      await api.patch(`/teams/${team.id}`, { proclubs_url: externalIdInput.trim() });
      setTeam((prev) => prev ? { ...prev, proclubs_url: externalIdInput.trim() } : prev);
      setLinkSuccess('Club ProClubs lié avec succès !');
      setTimeout(() => setLinkSuccess(''), 4000);
    } catch (err: any) {
      setLinkError(err.response?.data?.message ?? 'Erreur lors de la liaison.');
    } finally {
      setLinkingClub(false);
    }
  };

  return (
    <TeamErrorBoundary>
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-amber-400/5 border border-amber-400/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">Gestion du Club</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {isLoading ? (
              <span className="inline-block w-48 h-8 rounded-lg bg-white/5 animate-pulse" />
            ) : (
              team?.name ?? 'Effectif du Club'
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLoading ? '\u00a0' : `${allMembers.length} membres enregistrés dans le système`}
          </p>
        </div>

        {canRecruit && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-[#0A0E1A] shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:brightness-110 active:scale-95 transition-all duration-200 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Recruter un joueur
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total joueurs', value: isLoading ? '—' : players.length, accent: 'text-blue-400' },
          { label: 'Staff / Managers', value: isLoading ? '—' : staff.length, accent: 'text-emerald-400' },
          { label: 'Note moy. équipe', value: isLoading ? '—' : avgRating > 0 ? avgRating.toFixed(1) : 'N/A', accent: 'text-amber-400' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl bg-[#0D1221] border border-white/5 p-4 flex flex-col items-center">
            <span className={`text-2xl font-black tabular-nums ${accent}`}>{value}</span>
            <span className="mt-0.5 text-xs text-slate-500 text-center">{label}</span>
          </div>
        ))}
      </div>

      {/* Prestige du Club */}
      {team && !isLoading && (
        <PrestigeSection xp={team.xp ?? 0} prestigeLevel={team.prestige_level ?? 1} />
      )}

      {/* Erreur */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Équipe non trouvée */}
      {!isLoading && !team && !error && (
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] p-12 text-center space-y-3">
          <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">Équipe non trouvée</h2>
          <p className="text-sm text-slate-500">
            Vous n'êtes actuellement membre d'aucune équipe, ou les données n'ont pas pu être chargées.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
        {([
          { key: 'roster' as const, label: 'Effectif', icon: Users },
          { key: 'finance' as const, label: 'Finance', icon: Wallet },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === key
                ? 'bg-amber-400/15 text-amber-400 border border-amber-400/25 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: Effectif (Roster) ══════════ */}
      {activeTab === 'roster' && (
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Roster actuel</h2>
            </div>
            <span className="text-xs text-slate-600 bg-white/5 px-2.5 py-1 rounded-full">
              Saison 2025
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Joueur (Pseudo EA)', 'Poste', 'Rôle', 'Matchs joués', 'Note Moy. (AMR)'].map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-600"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
                ) : allMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-600">
                      Aucun membre dans cette équipe.
                    </td>
                  </tr>
                ) : (
                  allMembers.map((member) => {
                    const { user, club_role } = member;
                    const role = roleConfig[club_role];
                    const RoleIcon = role.icon;
                    const position = user.preferred_position;
                    const posColor = position ? positionColors[position] : 'bg-slate-500/15 text-slate-400 border-slate-500/30';
                    const posLabel = position ? positionLabel[position] : '—';
                    const matchesPlayed = user.stats?.matches_played ?? 0;
                    const avgRatingPlayer = user.stats?.average_rating ?? 0;
                    const pseudo = user.ea_persona_name ?? `Joueur #${user.id.slice(0, 6)}`;

                    return (
                      <tr
                        key={user.id}
                        className="group hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-white/10 flex items-center justify-center text-sm font-bold text-amber-400 uppercase shrink-0 group-hover:border-amber-400/30 transition-colors">
                              {pseudo.charAt(0)}
                            </div>
                            <div>
                              <Link
                                to={`/dashboard/profile/${user.id}`}
                                className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors hover:underline decoration-amber-400/40 underline-offset-2"
                              >
                                {pseudo}
                              </Link>
                              <p className="text-xs text-slate-600">{user.nationality ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border tracking-wide ${posColor}`}>
                            {posLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${role.className}`}>
                            <RoleIcon className="w-3 h-3" />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-white tabular-nums">{matchesPlayed}</span>
                          <span className="text-xs text-slate-600 ml-1">matchs</span>
                        </td>
                        <td className="px-6 py-4 min-w-[160px]">
                          <RatingBar value={avgRatingPlayer} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              {isLoading ? '…' : `${allMembers.length} membre${allMembers.length > 1 ? 's' : ''} au total`}
            </span>
            <span className="text-xs text-slate-700">Données live — v1.0</span>
          </div>
        </div>
      )}

      {/* ══════════ TAB: Finance ══════════ */}
      {activeTab === 'finance' && (
        <>
          {/* Budget overview cards */}
          {finance && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#0D1221] border border-emerald-500/15 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Budget</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-emerald-400">{formatMoney(finance?.budget ?? 0)} €</span>
              </div>
              <div className="rounded-xl bg-[#0D1221] border border-blue-500/15 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Contrats</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-blue-400">{finance?.contracts?.length ?? 0}</span>
              </div>
              <div className="rounded-xl bg-[#0D1221] border border-amber-500/15 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Masse salariale</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-amber-400">
                  {formatMoney((finance?.contracts ?? []).reduce((s, c) => s + (c.salary ?? 0), 0))} €
                  <span className="text-xs font-semibold text-slate-500 ml-1">/sem</span>
                </span>
              </div>
            </div>
          )}

          {financeLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          )}

          {finance && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transactions list */}
              <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Dernières transactions</h2>
                </div>
                <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                  {(finance?.transactions ?? []).length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-600">
                      Aucune transaction enregistrée.
                    </div>
                  ) : (
                    (finance?.transactions ?? []).map((tx) => {
                      const cfg = txTypeConfig[tx.type];
                      const TxIcon = cfg.icon;
                      const isPositive = tx.amount >= 0;
                      return (
                        <div key={tx.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPositive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <TxIcon className={`w-4 h-4 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {tx.description ?? cfg.label}
                            </p>
                            <p className="text-xs text-slate-600">
                              {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}
                              <span className={cfg.color}>{cfg.label}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isPositive ? (
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                            )}
                            <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : ''}{formatMoney(tx.amount)} €
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Contracts table */}
              <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Contrats joueurs</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Joueur', 'Salaire /sem', 'Clause', 'Expiration'].map((col) => (
                          <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-600">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(finance?.contracts ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-600">
                            Aucun contrat actif.
                          </td>
                        </tr>
                      ) : (
                        (finance?.contracts ?? []).map((c) => {
                          const expired = new Date(c.expires_at) < new Date();
                          return (
                            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-3.5">
                                <Link
                                  to={`/dashboard/profile/${c.user_id}`}
                                  className="text-sm font-semibold text-white hover:text-amber-400 transition-colors"
                                >
                                  {c.user.ea_persona_name ?? `#${c.user_id.slice(0, 6)}`}
                                </Link>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-bold text-amber-400 tabular-nums">{formatMoney(c.salary)} €</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-bold text-blue-400 tabular-nums">{formatMoney(c.release_clause)} €</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-xs font-semibold ${expired ? 'text-red-400' : 'text-slate-400'}`}>
                                  {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Section Liaison EA Sports — visible pour Manager / Fondateur */}
      {isManager && team && (
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Liaison EA Sports</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isSynced
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSynced ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {isSynced ? 'Synchronisé' : 'Non lié'}
            </span>
          </div>
          <div className="px-6 py-6 space-y-4">
            <p className="text-sm text-slate-400">
              Liez votre club EA Sports FC Pro Clubs pour synchroniser automatiquement les résultats et statistiques de matchs.
            </p>

            {linkSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-[fadeIn_0.3s_ease-out]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {linkSuccess}
              </div>
            )}
            {linkError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-[fadeIn_0.3s_ease-out]">
                {linkError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600 mb-2">
                  URL ProClubs.io
                </label>
                <input
                  type="text"
                  value={externalIdInput}
                  onChange={(e) => setExternalIdInput(e.target.value)}
                  placeholder="ex: https://proclubs.io/club/ps5/mon-club/12345/overview"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-amber-400/10 text-white text-sm placeholder:text-slate-700 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 tabular-nums"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleLinkClub}
                  disabled={linkingClub || !externalIdInput.trim()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-[#0A0E1A] shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {linkingClub ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  {isSynced ? 'Mettre à jour' : 'Lier le club'}
                </button>
              </div>
            </div>

            {isSynced && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-600">URL actuelle :</span>
                <a
                  href={team.proclubs_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/15 text-amber-400 text-xs font-mono hover:bg-amber-400/20 transition-colors truncate max-w-xs"
                >
                  {team.proclubs_url}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Recrutement — visible uniquement pour Fondateur / Manager / Co-Manager */}
      {canRecruit && team && (
        <div className="rounded-2xl border border-white/5 bg-[#0D1221] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Recrutement</h2>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-slate-400 mb-4">
              En tant que <span className="text-white font-medium">{roleConfig[currentMember!.club_role].label}</span>, vous pouvez inviter de nouveaux joueurs à rejoindre <span className="text-amber-400 font-medium">{team.name}</span>.
            </p>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-[#0A0E1A] shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:brightness-110 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Inviter un Joueur
            </button>
          </div>
        </div>
      )}

      {/* Modale d'invitation */}
      {team && (
        <InvitePlayerModal
          teamId={team.id}
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </div>
    </TeamErrorBoundary>
  );
}
