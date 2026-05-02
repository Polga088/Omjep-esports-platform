import { useState, useEffect, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, UserMinus, Star, Shield, Swords, Crown, Users, Link2,
  CheckCircle2, Loader2, Wallet, ArrowUpRight, ArrowDownRight,
  FileText, TrendingUp, Banknote, Trophy, Repeat, Gem, Info,
  AlertTriangle, Sparkles, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '@/hooks/useAuth';
import InvitePlayerModal from '@/components/InvitePlayerModal';
import { xpProgress } from '@/lib/leveling';
import { formatCurrency } from '@/utils/formatCurrency';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

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
        <div className="rounded-2xl border border-omjep-danger/25 bg-omjep-danger/8 p-8 text-center space-y-3">
          <AlertTriangle className="mx-auto h-8 w-8 text-omjep-danger" />
          <h2 className="text-lg font-bold text-omjep-text-primary">Une erreur est survenue</h2>
          <p className="text-sm text-omjep-text-secondary">
            L&apos;affichage de la page équipe a rencontré un problème.
          </p>
          <p className="break-all font-mono text-xs text-omjep-text-muted">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/50 px-5 py-2 text-sm font-semibold text-omjep-text-primary transition-colors hover:border-omjep-mauve/40 hover:bg-omjep-mauve/10"
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
  manager_id?: string | null;
  budget?: number;
  xp?: number;
  prestige_level?: number;
  members: TeamMember[];
}

// ─── Types Finance ────────────────────────────────────────────────────────────

type TransactionType = 'MATCH_REWARD' | 'TRANSFER' | 'WAGE' | 'KICK_FEE';

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
  start_date: string;
  end_date: string;
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
  ATT: 'border-omjep-mauve/30 bg-omjep-mauve/15 text-omjep-mauve',
};

const positionLabel: Record<Position, string> = {
  GK: 'GB', DC: 'DC', LAT: 'LAT', RAT: 'RAT',
  MDC: 'MDC', MOC: 'MOC', MG: 'MG', MD: 'MD', BU: 'BU', ATT: 'ATT',
};

const roleConfig: Record<ClubRole, { label: string; badgeClass: string; icon: React.ElementType }> = {
  FOUNDER: {
    label: 'Fondateur',
    badgeClass: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
    icon: Crown,
  },
  MANAGER: {
    label: 'Manager',
    badgeClass: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
    icon: Shield,
  },
  CO_MANAGER: {
    label: 'Co-Manager',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    icon: Users,
  },
  PLAYER: {
    label: 'Joueur',
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    icon: Swords,
  },
};

// ─── Composants utilitaires ──────────────────────────────────────────────────

function RatingBar({ value }: { value: number }) {
  const percentage = (value / 10) * 100;
  const color =
    value >= 8   ? 'from-omjep-success to-omjep-cobalt' :
    value >= 6.5 ? 'from-omjep-cobalt to-omjep-mauve' :
                   'from-omjep-mauve/70 to-omjep-neutral';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-omjep-bg-elevated">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums text-omjep-text-secondary">
        {value > 0 ? value.toFixed(1) : 'N/A'}
      </span>
    </div>
  );
}

function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-omjep-border/60 last:border-b-0">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 rounded-md bg-omjep-bg-panel-soft animate-pulse" style={{ width: i === 0 ? '60%' : '40%' }} />
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
    <div className="overflow-hidden rounded-3xl border border-omjep-border bg-omjep-bg-panel/90 backdrop-blur-md shadow-[var(--omjep-shadow-sm)]">
      <div className="flex items-center justify-between border-b border-omjep-border/80 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Gem className="h-5 w-5 shrink-0 text-omjep-mauve" />
          <h3 className="text-sm font-bold tracking-wide text-omjep-text-primary">Prestige du Club</h3>
        </div>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-omjep-border bg-omjep-bg-panel-soft/80 text-omjep-text-muted transition-colors hover:border-omjep-mauve/40 hover:bg-omjep-mauve/10 hover:text-omjep-mauve"
            aria-label="Informations prestige"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-omjep-border bg-omjep-bg-panel px-3.5 py-2.5 text-xs leading-relaxed text-omjep-text-secondary shadow-xl backdrop-blur-md">
              <p className="mb-1 font-semibold text-omjep-mauve">Bonus de Prestige</p>
              <p>
                Le Prestige augmente à chaque victoire et performance du club. Plus le niveau est élevé, plus les{' '}
                <span className="font-medium text-omjep-text-primary">bonus de sponsoring</span> sont importants.
              </p>
              <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-omjep-border bg-omjep-bg-panel" />
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-6">
        <div className="flex items-center gap-5">
          {/* Badge niveau — hexagone verre */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="shrink-0"
          >
            <div
              className="relative flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center border border-omjep-mauve/45 bg-omjep-mauve/15 ring-1 ring-omjep-mauve/30 backdrop-blur-xl [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]"
              style={{
                boxShadow:
                  '0 0 22px color-mix(in srgb, var(--omjep-accent) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Prstg</span>
              <span className="text-2xl font-black tabular-nums leading-none text-omjep-text-primary">
                {prestigeLevel}
              </span>
            </div>
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold tabular-nums text-omjep-text-secondary">
                {progress.current.toLocaleString('fr-FR')} / {progress.needed.toLocaleString('fr-FR')} XP
              </span>
              <span className="text-xs font-bold text-omjep-text-secondary">Niv. {progress.nextLevel}</span>
            </div>

            <div className="relative h-3.5 overflow-hidden rounded-full border border-omjep-border bg-omjep-bg-elevated">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-omjep-mauve to-omjep-cobalt shadow-[var(--omjep-glow-mauve-soft)]"
              >
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-0 w-[42%] min-w-[1.5rem] bg-gradient-to-r from-transparent via-omjep-text-primary/25 to-transparent opacity-75"
                  style={{ skewX: '-16deg' }}
                  animate={{ x: ['-100%', '280%'] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                />
              </motion.div>
            </div>

            <p className="mt-2 text-[10px] text-omjep-text-muted">
              <span className="font-semibold text-omjep-mauve">{xp.toLocaleString('fr-FR')}</span> XP club cumulées
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Finance config & helpers ─────────────────────────────────────────────────

const KICK_FEE_OC = 5000;

const txTypeConfig: Record<TransactionType, { label: string; icon: React.ElementType; color: string }> = {
  MATCH_REWARD: { label: 'Récompense', icon: Trophy, color: 'text-omjep-success' },
  TRANSFER:     { label: 'Transfert',  icon: Repeat, color: 'text-omjep-cobalt' },
  WAGE:         { label: 'Salaire',    icon: Banknote, color: 'text-omjep-gold' },
  KICK_FEE:     { label: 'Licenciement', icon: UserMinus, color: 'text-omjep-danger' },
};

// ─── Page principale ─────────────────────────────────────────────────────────

export default function MyTeam() {
  const [team, setTeam] = useState<MyTeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<FinanceTab>('roster');
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  const [externalIdInput, setExternalIdInput] = useState('');
  const [linkingClub, setLinkingClub] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState('');
  const [linkError, setLinkError] = useState('');
  const [kickTarget, setKickTarget] = useState<TeamMember | null>(null);
  const [kickLoading, setKickLoading] = useState(false);
  const [roleBusyUserId, setRoleBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.get<MyTeamData>('/teams/my-team')
      .then(({ data }) => {
        if (!cancelled) setTeam(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            setTeam(null);
            setError(null);
            return;
          }
          const msg: string =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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

  /** Accès onglet / bloc liaison EA (staff club). */
  const isManager =
    currentMember &&
    ['FOUNDER', 'MANAGER', 'CO_MANAGER'].includes(currentMember.club_role);

  const isSynced = !!team?.proclubs_url;

  /** Manager désigné (`manager_id`) — promotion co-manager & licenciement. */
  const isDesignatedManager = !!user?.id && team?.manager_id === user.id;

  /** Outils de gestion (effectif, finance, actions) : manager désigné, fondateur, co-manager, admin. */
  const canManage =
    user?.role === 'ADMIN' ||
    isDesignatedManager ||
    currentMember?.club_role === 'FOUNDER' ||
    currentMember?.club_role === 'CO_MANAGER';

  /** Licenciement : réservé au manager désigné (et admin). */
  const canKickPlayer = user?.role === 'ADMIN' || isDesignatedManager;

  /** Promotion / destitution co-managers : manager désigné, rôle club Manager, ou fondateur. */
  const canPromoteCoManagers =
    isDesignatedManager ||
    currentMember?.club_role === 'FOUNDER' ||
    currentMember?.club_role === 'MANAGER';

  const rosterCols = canManage ? 6 : 5;

  const showTeamShell = Boolean(team || isLoading);

  const reloadTeamAndFinance = async () => {
    const { data } = await api.get<MyTeamData>('/teams/my-team');
    setTeam(data);
    try {
      const fin = await api.get<FinanceData>(`/finance/${data.id}`);
      setFinance(fin.data);
    } catch {
      /* accès finance refusé ou erreur réseau */
    }
  };

  const handleKickClick = (member: TeamMember) => {
    setKickTarget(member);
  };

  const confirmKickMember = async () => {
    if (!kickTarget) return;
    setKickLoading(true);
    try {
      const targetId = kickTarget.user_id || kickTarget.user?.id;
      if (!targetId) {
        toast.error('Identifiant joueur introuvable.');
        setKickLoading(false);
        return;
      }
      await api.post('/clubs/kick-member', { target_user_id: targetId });
      toast.success('Joueur licencié', {
        description: `${KICK_FEE_OC.toLocaleString('fr-FR')} OC ont été débités du budget club.`,
      });
      setKickTarget(null);
      await reloadTeamAndFinance();
      window.dispatchEvent(new CustomEvent('omjep:transfers-refresh'));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Licenciement impossible.';
      toast.error(typeof msg === 'string' ? msg : 'Licenciement impossible.');
    } finally {
      setKickLoading(false);
    }
  };

  useEffect(() => {
    if (team?.proclubs_url) setExternalIdInput(team.proclubs_url);
  }, [team?.proclubs_url]);

  const handleLinkClub = async () => {
    if (!team || !externalIdInput.trim()) return;
    setLinkingClub(true);
    setLinkError('');
    setLinkSuccess('');
    const trimmed = externalIdInput.trim();
    try {
      await api.patch(`/teams/${team.id}`, { proclubs_url: trimmed });
      setTeam((prev) => (prev ? { ...prev, proclubs_url: trimmed } : prev));
      await api.post(`/clubs/${team.id}/sync-stats`);
      setLinkSuccess('Club lié et statistiques EA synchronisées.');
      await reloadTeamAndFinance();
      setTimeout(() => setLinkSuccess(''), 5000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setLinkError(typeof msg === 'string' ? msg : 'Erreur lors de la liaison ou de la synchronisation.');
    } finally {
      setLinkingClub(false);
    }
  };

  const handlePromoteCoManager = async (member: TeamMember) => {
    if (!team) return;
    const uid = member.user_id;
    setRoleBusyUserId(uid);
    try {
      await api.patch('/clubs/promote-co-manager', { target_user_id: uid });
      toast.success('Co-manager nommé');
      await reloadTeamAndFinance();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(typeof msg === 'string' ? msg : 'Impossible de nommer le co-manager.');
    } finally {
      setRoleBusyUserId(null);
    }
  };

  const handleDemoteCoManager = async (member: TeamMember) => {
    if (!team) return;
    const uid = member.user_id;
    setRoleBusyUserId(uid);
    try {
      await api.patch('/clubs/demote-co-manager', { target_user_id: uid });
      toast.success('Co-manager destitué');
      await reloadTeamAndFinance();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(typeof msg === 'string' ? msg : 'Impossible de destituer.');
    } finally {
      setRoleBusyUserId(null);
    }
  };

  return (
    <TeamErrorBoundary>
    <div className="cockpit-page dashboard-phase3-team space-y-6">
      <DashboardPageHeading
        eyebrow="Club Operations"
        title={isLoading ? 'Mon équipe' : 'Mon équipe'}
        subtitle={
          isLoading
            ? 'Gestion de l’effectif, des rôles et des finances club'
            : `${allMembers.length} membres enregistrés dans le système`
        }
        action={
          canRecruit ? (
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="group inline-flex items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/50 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-omjep-mauve/45 hover:bg-omjep-mauve/10 hover:shadow-md active:scale-[0.99]"
            >
              <UserPlus className="h-4 w-4 text-omjep-mauve" aria-hidden />
              Inviter un joueur
            </button>
          ) : undefined
        }
      />

      {/* Stats Bento — visible seulement avec équipe ou chargement */}
      {showTeamShell ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total joueurs */}
        <div className="group relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/80 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-omjep-mauve/35 hover:shadow-lg hover:shadow-black/20 dark:hover:shadow-black/40">
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 translate-x-2 translate-y-2 text-omjep-text-primary opacity-[0.04]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            aria-hidden
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-omjep-border/80 bg-omjep-mauve/12 text-omjep-mauve transition-colors duration-200 group-hover:border-omjep-mauve/40 group-hover:bg-omjep-mauve/18">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-omjep-text-secondary">Total joueurs</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-omjep-text-primary">
            {isLoading ? '—' : players.length}
          </p>
        </div>

        {/* Staff / Managers */}
        <div className="group relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/80 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-omjep-mauve/35 hover:shadow-lg hover:shadow-black/20 dark:hover:shadow-black/40">
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 translate-x-2 translate-y-2 text-omjep-success opacity-[0.06]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 10l2-6 4 3 4-6 4 6 4-3 2 6v10H4V10z" />
            <path d="M4 20h16" />
          </svg>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-omjep-success/25 bg-omjep-success/10 text-omjep-success transition-colors duration-200 group-hover:border-omjep-success/40 group-hover:bg-omjep-success/15">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-omjep-text-secondary">Staff / Managers</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-omjep-success">
            {isLoading ? '—' : staff.length}
          </p>
        </div>

        {/* Note moy. équipe */}
        <div className="group relative overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/80 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-omjep-mauve/35 hover:shadow-lg hover:shadow-black/20 dark:hover:shadow-black/40">
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 translate-x-2 translate-y-2 text-omjep-gold opacity-[0.08]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            aria-hidden
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-omjep-border-gold/35 bg-omjep-gold/10 text-omjep-gold transition-colors duration-200 group-hover:border-omjep-border-gold/55 group-hover:bg-omjep-gold/15">
            <Star className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-omjep-text-secondary">Note moy. équipe</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-omjep-gold">
            {isLoading ? '—' : avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
          </p>
        </div>
      </div>
      ) : null}

      {/* Prestige du Club */}
      {team && !isLoading && (
        <PrestigeSection xp={team.xp ?? 0} prestigeLevel={team.prestige_level ?? 1} />
      )}

      {/* Erreur */}
      {error && !isLoading && (
        <div className="rounded-xl border border-omjep-danger/25 bg-omjep-danger/8 px-5 py-4 text-sm text-omjep-danger">
          {error}
        </div>
      )}

      {/* Onboarding — pas d&apos;équipe (404 API) */}
      {!isLoading && !team && !error && (
        <div className="rounded-2xl border border-omjep-border bg-omjep-bg-panel/80 p-8 shadow-md md:p-10 md:text-left text-center transition-shadow duration-300 hover:border-omjep-mauve/30 hover:shadow-lg">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-omjep-mauve/35 bg-omjep-mauve/12 text-omjep-mauve md:mx-0">
            <Sparkles className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-omjep-text-primary md:text-2xl">
            Rejoignez une équipe pour débloquer le club
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-omjep-text-secondary md:mx-0">
            Le mercato et les invitations staff vous permettent d&apos;intégrer un roster. Les managers peuvent créer leur structure et recruter depuis le cockpit.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link
              to="/dashboard/transfers"
              className="inline-flex items-center gap-2 rounded-xl border border-omjep-mauve/50 bg-omjep-mauve/15 px-5 py-2.5 text-sm font-semibold text-omjep-text-primary transition-all duration-200 hover:bg-omjep-mauve/25 hover:shadow-md active:scale-[0.99]"
            >
              <Repeat className="h-4 w-4 text-omjep-mauve" aria-hidden />
              Parcourir le mercato
            </Link>
            <Link
              to="/dashboard/schedule"
              className="inline-flex items-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/60 px-5 py-2.5 text-sm font-semibold text-omjep-text-primary transition-all duration-200 hover:border-omjep-mauve/35 hover:bg-omjep-bg-elevated/80 active:scale-[0.99]"
            >
              <Calendar className="h-4 w-4 text-omjep-text-secondary" aria-hidden />
              Voir le calendrier
            </Link>
            {user?.role === 'MANAGER' ? (
              <Link
                to="/dashboard/manager/club"
                className="inline-flex items-center gap-2 rounded-xl border border-omjep-border-gold/45 bg-omjep-gold/10 px-5 py-2.5 text-sm font-semibold text-omjep-gold transition-all duration-200 hover:bg-omjep-gold/15 active:scale-[0.99]"
              >
                <Trophy className="h-4 w-4" aria-hidden />
                Créer mon club
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {/* Tabs + contenu effectif / finance */}
      {showTeamShell ? (
      <>
      <div className="flex w-fit items-center gap-1 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/40 p-1">
        {([
          { key: 'roster' as const, label: 'Effectif', icon: Users },
          { key: 'finance' as const, label: 'Finance', icon: Wallet },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === key
                ? 'border border-omjep-mauve/35 bg-omjep-mauve/15 text-omjep-mauve shadow-sm'
                : 'border border-transparent text-omjep-text-muted hover:text-omjep-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: Effectif (Roster) ══════════ */}
      {activeTab === 'roster' && (
        <div className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/90 backdrop-blur-md shadow-[var(--omjep-shadow-sm)]">
          <div className="flex items-center justify-between border-b border-omjep-border/80 px-5 py-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-omjep-gold" />
              <h2 className="text-sm font-semibold text-omjep-text-primary">Roster actuel</h2>
            </div>
            <span className="rounded-full border border-omjep-border bg-omjep-bg-panel-soft/80 px-2.5 py-1 text-xs text-omjep-text-muted">
              Saison 2025
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-omjep-border/80">
                  {[
                    'Joueur (Pseudo EA)',
                    'Poste',
                    'Rôle',
                    'Matchs joués',
                    'Note Moy. (AMR)',
                    ...(canManage ? ['Actions'] : []),
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-omjep-text-muted"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => <SkeletonRow key={i} cols={rosterCols} />)
                ) : allMembers.length === 0 ? (
                  <tr>
                    <td colSpan={rosterCols} className="px-5 py-14">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/50 text-omjep-mauve">
                          <Users className="h-6 w-6" aria-hidden />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-omjep-text-primary">Effectif vide</p>
                          <p className="mt-1 text-xs leading-relaxed text-omjep-text-secondary">
                            Invitez vos coéquipiers pour constituer le roster et activer la finance club.
                          </p>
                        </div>
                        {canRecruit ? (
                          <button
                            type="button"
                            onClick={() => setInviteModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-omjep-mauve/45 bg-omjep-mauve/12 px-4 py-2 text-xs font-semibold text-omjep-mauve transition-all hover:bg-omjep-mauve/20"
                          >
                            <UserPlus className="h-4 w-4" aria-hidden />
                            Inviter un joueur
                          </button>
                        ) : (
                          <Link
                            to="/dashboard/transfers"
                            className="text-xs font-semibold text-omjep-gold underline-offset-2 hover:underline"
                          >
                            Découvrir le mercato
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  allMembers.map((member, rowIndex) => {
                    const rowUser = member.user;
                    const { club_role } = member;
                    const role = roleConfig[club_role];
                    const RoleIcon = role.icon;
                    const position = rowUser.preferred_position;
                    const posColor = position ? positionColors[position] : 'border-omjep-border bg-omjep-bg-panel-soft text-omjep-text-muted';
                    const posLabel = position ? positionLabel[position] : '—';
                    const matchesPlayed = rowUser.stats?.matches_played ?? 0;
                    const avgRatingPlayer = rowUser.stats?.average_rating ?? 0;
                    const pseudo = rowUser.ea_persona_name ?? `Joueur #${rowUser.id.slice(0, 6)}`;
                    const isLast = rowIndex === allMembers.length - 1;
                    const memberId = member.user_id || rowUser?.id;
                    const showPromote =
                      canPromoteCoManagers &&
                      club_role === 'PLAYER' &&
                      memberId !== user?.id;
                    const showDemote =
                      canPromoteCoManagers && club_role === 'CO_MANAGER';
                    const showKickButton =
                      canKickPlayer && club_role === 'PLAYER' && memberId !== user?.id;

                    return (
                      <tr
                        key={rowUser.id}
                        className={`group transition-colors duration-200 hover:bg-omjep-mauve/6 ${
                          isLast ? '' : 'border-b border-omjep-border/60'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-omjep-bg-elevated text-xs font-bold uppercase text-omjep-text-primary shadow-inner ring-1 ring-omjep-border">
                              {pseudo.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/dashboard/profile/${rowUser.id}`}
                                className="text-sm font-semibold text-omjep-text-primary transition-colors hover:text-omjep-mauve hover:underline decoration-omjep-mauve/40 underline-offset-2"
                              >
                                {pseudo}
                              </Link>
                              <p className="text-xs text-omjep-text-muted">{rowUser.nationality ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold tracking-wide ${posColor}`}>
                            {posLabel}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${role.badgeClass}`}
                          >
                            <RoleIcon className="h-3 w-3 shrink-0 opacity-90" />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold tabular-nums text-omjep-text-primary">{matchesPlayed}</span>
                          <span className="ml-1 text-xs text-omjep-text-muted">matchs</span>
                        </td>
                        <td className="min-w-[160px] px-5 py-4">
                          <RatingBar value={avgRatingPlayer} />
                        </td>
                        {canManage && (
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end gap-2">
                              {showPromote && (
                                <button
                                  type="button"
                                  disabled={roleBusyUserId === memberId}
                                  onClick={() => handlePromoteCoManager(member)}
                                  className="rounded border border-omjep-mauve/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-omjep-mauve transition hover:bg-omjep-mauve/10 disabled:opacity-50"
                                >
                                  {roleBusyUserId === memberId ? '…' : 'Nommer Adjoint'}
                                </button>
                              )}
                              {showDemote && (
                                <button
                                  type="button"
                                  disabled={roleBusyUserId === memberId}
                                  onClick={() => handleDemoteCoManager(member)}
                                  className="rounded border border-omjep-warning/35 bg-omjep-warning/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-omjep-warning transition hover:bg-omjep-warning/15 disabled:opacity-50"
                                >
                                  {roleBusyUserId === memberId ? '…' : 'Destituer'}
                                </button>
                              )}
                              {showKickButton ? (
                                <button
                                  type="button"
                                  onClick={() => handleKickClick(member)}
                                  className="ml-auto flex items-center gap-2 rounded border border-omjep-danger/30 bg-omjep-danger/10 px-3 py-1.5 font-mono text-[10px] uppercase text-omjep-danger transition-all hover:bg-omjep-danger/18"
                                >
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-omjep-danger" />
                                  Licencier (5k OC)
                                </button>
                              ) : memberId === user?.id ? (
                                <span className="font-mono text-[10px] text-omjep-text-muted">-- MY SELF --</span>
                              ) : (
                                !showPromote && !showDemote && (
                                  <span className="text-xs text-omjep-text-muted">—</span>
                                )
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-omjep-border/80 px-5 py-3">
            <span className="text-xs text-omjep-text-muted">
              {isLoading ? '…' : `${allMembers.length} membre${allMembers.length > 1 ? 's' : ''} au total`}
            </span>
            <span className="text-xs text-omjep-text-muted">Données live — v1.0</span>
          </div>
        </div>
      )}

      {/* ══════════ TAB: Finance ══════════ */}
      {activeTab === 'finance' && (
        <>
          {/* Budget overview cards */}
          {finance && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-omjep-success/20 bg-omjep-bg-panel/95 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-omjep-success/25 bg-omjep-success/10">
                    <Wallet className="h-4 w-4 text-omjep-success" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">Budget</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-omjep-success">{formatCurrency(finance?.budget ?? 0, 'OC')}</span>
              </div>
              <div className="rounded-xl border border-omjep-cobalt/25 bg-omjep-bg-panel/95 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-omjep-cobalt/25 bg-omjep-cobalt/10">
                    <FileText className="h-4 w-4 text-omjep-cobalt" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">Contrats</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-omjep-cobalt">{finance?.contracts?.length ?? 0}</span>
              </div>
              <div className="rounded-xl border border-omjep-gold/25 bg-omjep-bg-panel/95 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-omjep-gold/30 bg-omjep-gold/10">
                    <Banknote className="h-4 w-4 text-omjep-gold" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">Masse salariale</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-omjep-gold">
                  {formatCurrency((finance?.contracts ?? []).reduce((s, c) => s + (c.salary ?? 0), 0), 'OC')}
                  <span className="ml-1 text-xs font-semibold text-omjep-text-muted">/sem</span>
                </span>
              </div>
            </div>
          )}

          {financeLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-omjep-mauve" />
            </div>
          )}

          {finance && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transactions list */}
              <div className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/95">
                <div className="flex items-center gap-2 border-b border-omjep-border/80 px-6 py-4">
                  <TrendingUp className="h-4 w-4 text-omjep-gold" />
                  <h2 className="text-sm font-semibold text-omjep-text-primary">Dernières transactions</h2>
                </div>
                <div className="max-h-[420px] divide-y divide-omjep-border/60 overflow-y-auto">
                  {(finance?.transactions ?? []).length === 0 ? (
                    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/80 text-omjep-gold">
                        <TrendingUp className="h-5 w-5" aria-hidden />
                      </div>
                      <p className="text-sm font-medium text-omjep-text-primary">Aucune transaction enregistrée</p>
                      <p className="max-w-xs text-xs text-omjep-text-secondary">
                        Les primes de match et transferts apparaîtront ici dès que l&apos;activité économique du club démarre.
                      </p>
                      <Link
                        to="/dashboard/transfers"
                        className="inline-flex items-center gap-2 rounded-lg border border-omjep-mauve/30 bg-omjep-mauve/10 px-4 py-2 text-xs font-semibold text-omjep-mauve transition-colors hover:bg-omjep-mauve/15"
                      >
                        <Repeat className="h-3.5 w-3.5" aria-hidden />
                        Ouvrir le mercato
                      </Link>
                    </div>
                  ) : (
                    (finance?.transactions ?? []).map((tx) => {
                      const cfg =
                        txTypeConfig[tx.type as TransactionType] ?? {
                          label: String(tx.type),
                          icon: FileText,
                          color: 'text-omjep-text-muted',
                        };
                      const TxIcon = cfg.icon;
                      const isPositive = tx.amount >= 0;
                      return (
                        <div key={tx.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-omjep-mauve/6">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            isPositive ? 'border-omjep-success/25 bg-omjep-success/10' : 'border-omjep-warning/30 bg-omjep-warning/10'
                          }`}>
                            <TxIcon className={`h-4 w-4 ${isPositive ? 'text-omjep-success' : 'text-omjep-warning'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-omjep-text-primary">
                              {tx.description ?? cfg.label}
                            </p>
                            <p className="text-xs text-omjep-text-muted">
                              {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}
                              <span className={cfg.color}>{cfg.label}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isPositive ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-omjep-success" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5 text-omjep-warning" />
                            )}
                            <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-omjep-success' : 'text-omjep-warning'}`}>
                              {isPositive ? '+' : ''}{formatCurrency(tx.amount, 'OC')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Contracts table */}
              <div className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/95">
                <div className="flex items-center gap-2 border-b border-omjep-border/80 px-6 py-4">
                  <FileText className="h-4 w-4 text-omjep-gold" />
                  <h2 className="text-sm font-semibold text-omjep-text-primary">Contrats joueurs</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-omjep-border/80">
                        {['Joueur', 'Salaire /sem', 'Clause', 'Expiration'].map((col) => (
                          <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-omjep-border/60">
                      {(finance?.contracts ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-14">
                            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                              <FileText className="h-8 w-8 text-omjep-text-muted" aria-hidden />
                              <p className="text-sm font-medium text-omjep-text-primary">Aucun contrat actif</p>
                              <p className="text-xs text-omjep-text-secondary">
                                Les salaires et clauses libératoires s&apos;affichent ici après signature via le mercato.
                              </p>
                              <Link
                                to="/dashboard/transfers"
                                className="text-xs font-semibold text-omjep-mauve hover:underline"
                              >
                                Aller au mercato
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (finance?.contracts ?? []).map((c) => {
                          const expired = new Date(c.end_date) < new Date();
                          return (
                            <tr key={c.id} className="transition-colors hover:bg-omjep-mauve/6">
                              <td className="px-5 py-3.5">
                                <Link
                                  to={`/dashboard/profile/${c.user_id}`}
                                  className="text-sm font-semibold text-omjep-text-primary transition-colors hover:text-omjep-mauve"
                                >
                                  {c.user.ea_persona_name ?? `#${c.user_id.slice(0, 6)}`}
                                </Link>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-bold tabular-nums text-omjep-gold">{formatCurrency(c.salary ?? 0, 'OC')}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-bold tabular-nums text-omjep-cobalt">{formatCurrency(c.release_clause ?? 0, 'OC')}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-xs font-semibold ${expired ? 'text-omjep-warning' : 'text-omjep-text-muted'}`}>
                                  {new Date(c.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
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
      </>
      ) : null}

      {/* Section Liaison EA Sports — visible pour Manager / Fondateur */}
      {isManager && team && (
        <div className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/95">
          <div className="flex items-center justify-between border-b border-omjep-border/80 px-6 py-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-omjep-gold" />
              <h2 className="text-sm font-semibold text-omjep-text-primary">Liaison EA Sports</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                isSynced
                  ? 'border-omjep-success/30 bg-omjep-success/10 text-omjep-success'
                  : 'border-omjep-border bg-omjep-bg-panel-soft text-omjep-text-muted'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isSynced ? 'bg-omjep-success' : 'bg-omjep-text-muted'}`} />
              {isSynced ? 'Synchronisé' : 'Non lié'}
            </span>
          </div>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm text-omjep-text-secondary">
              Liez votre club EA Sports FC Pro Clubs pour synchroniser automatiquement les résultats et statistiques de matchs.
            </p>

            {linkSuccess && (
              <div className="flex animate-[fadeIn_0.3s_ease-out] items-center gap-2 rounded-xl border border-omjep-success/25 bg-omjep-success/10 px-3 py-2 text-xs text-omjep-success">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {linkSuccess}
              </div>
            )}
            {linkError && (
              <div className="flex animate-[fadeIn_0.3s_ease-out] items-center gap-2 rounded-xl border border-omjep-danger/25 bg-omjep-danger/10 px-3 py-2 text-xs text-omjep-danger">
                {linkError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">
                  URL ProClubs.io
                </label>
                <input
                  type="text"
                  value={externalIdInput}
                  onChange={(e) => setExternalIdInput(e.target.value)}
                  placeholder="ex: https://proclubs.io/club/ps5/mon-club/12345/overview"
                  className="w-full rounded-xl border border-omjep-border bg-omjep-bg-panel-soft px-4 py-3 text-sm text-omjep-text-primary tabular-nums placeholder:text-omjep-text-muted transition-all duration-200 focus:border-omjep-mauve/40 focus:outline-none focus:ring-1 focus:ring-omjep-mauve/25"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleLinkClub}
                  disabled={linkingClub || !externalIdInput.trim()}
                  className="inline-flex min-h-[3rem] max-w-full items-center justify-center gap-2 rounded-xl border border-omjep-mauve/40 bg-omjep-mauve px-5 py-3 text-sm font-semibold text-white shadow-[var(--omjep-glow-mauve-soft)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[12rem]"
                >
                  {linkingClub ? (
                    <span className="flex flex-col items-center gap-1.5 px-1 sm:flex-row sm:gap-2">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      <span className="max-w-[min(100%,16rem)] text-center text-[11px] leading-snug sm:max-w-[20rem] sm:text-xs">
                        Synchronisation des données EA Sports en cours...
                      </span>
                    </span>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 shrink-0" />
                      {isSynced ? 'Mettre à jour' : 'Lier le club'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {isSynced && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-omjep-text-muted">URL actuelle :</span>
                <a
                  href={team.proclubs_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-xs truncate rounded-md border border-omjep-border bg-omjep-bg-panel-soft px-2 py-0.5 font-mono text-xs text-omjep-mauve transition-colors hover:border-omjep-mauve/35 hover:bg-omjep-mauve/8"
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
        <div className="overflow-hidden rounded-2xl border border-omjep-border bg-omjep-bg-panel/95">
          <div className="flex items-center gap-2 border-b border-omjep-border/80 px-6 py-4">
            <UserPlus className="h-4 w-4 text-omjep-gold" />
            <h2 className="text-sm font-semibold text-omjep-text-primary">Recrutement</h2>
          </div>
          <div className="px-6 py-6">
            <p className="mb-4 text-sm text-omjep-text-secondary">
              En tant que <span className="font-medium text-omjep-text-primary">{roleConfig[currentMember!.club_role].label}</span>, vous pouvez inviter de nouveaux joueurs à rejoindre <span className="font-medium text-omjep-gold">{team.name}</span>.
            </p>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-omjep-mauve/40 bg-omjep-mauve px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--omjep-glow-mauve-soft)] transition-all hover:brightness-110 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Inviter un Joueur
            </button>
          </div>
        </div>
      )}

      {/* Confirmation licenciement */}
      {kickTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--omjep-bg)_78%,black)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kick-modal-title"
        >
          <div className="tactical-modal-panel w-full max-w-md rounded-2xl border border-omjep-border p-6 shadow-[var(--omjep-shadow-lg)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-omjep-danger/30 bg-omjep-danger/10">
                <UserMinus className="h-5 w-5 text-omjep-danger" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="kick-modal-title" className="text-lg font-bold text-omjep-text-primary">
                  Licencier ce joueur ?
                </h2>
                <p className="mt-2 text-sm text-omjep-text-secondary">
                  <span className="font-semibold text-omjep-text-primary">
                    {kickTarget.user.ea_persona_name ?? `Joueur #${kickTarget.user_id.slice(0, 6)}`}
                  </span>{' '}
                  sera retiré de l&apos;effectif. Le budget du club sera débité de{' '}
                  <span className="font-mono font-semibold tabular-nums text-omjep-gold">
                    {KICK_FEE_OC.toLocaleString('fr-FR')} OC
                  </span>{' '}
                  (frais administratifs).
                </p>
                <p className="mt-3 text-xs text-omjep-text-muted">
                  Cette action est immédiate. Le joueur recevra une notification.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={kickLoading}
                onClick={() => setKickTarget(null)}
                className="rounded-xl border border-omjep-border px-4 py-2.5 text-sm font-medium text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={kickLoading}
                onClick={() => void confirmKickMember()}
                className="inline-flex items-center gap-2 rounded-xl border border-omjep-danger/40 bg-omjep-danger/12 px-4 py-2.5 text-sm font-semibold text-omjep-danger transition hover:bg-omjep-danger/18 disabled:opacity-50"
              >
                {kickLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                Confirmer ({KICK_FEE_OC.toLocaleString('fr-FR')} OC)
              </button>
            </div>
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
