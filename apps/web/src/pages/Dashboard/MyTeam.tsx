import { useState, useEffect, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserMinus, Star, Shield, Swords, Crown, Users,
  Loader2, Wallet, ArrowUpRight, ArrowDownRight,
  FileText, TrendingUp, Banknote, Trophy, Repeat, Gem, Info,
  AlertTriangle, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '@/hooks/useAuth';
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
  ATT: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
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
    value >= 8   ? 'from-emerald-500 to-emerald-400' :
    value >= 6.5 ? 'from-blue-500 to-blue-400' :
                   'from-amber-500 to-amber-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-omjep-bg-panel-soft">
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
    <tr>
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
    <div className="omjep-surface-elevated overflow-hidden backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-omjep-border/60 px-5 py-4">
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
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-700/80 bg-white/[0.04] text-slate-400 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300"
            aria-label="Informations prestige"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-gray-700 bg-slate-900/95 px-3.5 py-2.5 text-xs leading-relaxed text-slate-300 shadow-xl backdrop-blur-md">
              <p className="mb-1 font-semibold text-cyan-400">Bonus de Prestige</p>
              <p>
                Le Prestige augmente à chaque victoire et performance du club. Plus le niveau est élevé, plus les{' '}
                <span className="font-medium text-white">bonus de sponsoring</span> sont importants.
              </p>
              <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-gray-700 bg-slate-900/95" />
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
              className="relative flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center border border-cyan-400/45 bg-cyan-900/40 ring-1 ring-indigo-400/35 backdrop-blur-xl [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]"
              style={{
                boxShadow:
                  '0 0 22px rgba(99,102,241,0.35), 0 0 14px rgba(34,211,238,0.35), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -8px 20px rgba(6,182,212,0.15)',
              }}
            >
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Prstg</span>
              <span className="text-2xl font-black tabular-nums leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                {prestigeLevel}
              </span>
            </div>
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold tabular-nums text-gray-300">
                {progress.current.toLocaleString('fr-FR')} / {progress.needed.toLocaleString('fr-FR')} XP
              </span>
              <span className="text-xs font-bold text-gray-300">Niv. {progress.nextLevel}</span>
            </div>

            <div className="relative h-3.5 overflow-hidden rounded-full border border-white/[0.06] bg-gray-800/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-blue-500 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
              >
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-0 w-[42%] min-w-[1.5rem] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-75"
                  style={{ skewX: '-16deg' }}
                  animate={{ x: ['-100%', '280%'] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                />
              </motion.div>
            </div>

            <p className="mt-2 text-[10px] text-slate-500">
              <span className="font-semibold text-cyan-400/90">{xp.toLocaleString('fr-FR')}</span> XP club cumulées
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
  MATCH_REWARD: { label: 'Récompense', icon: Trophy, color: 'text-emerald-400' },
  TRANSFER:     { label: 'Transfert',  icon: Repeat, color: 'text-blue-400' },
  WAGE:         { label: 'Salaire',    icon: Banknote, color: 'text-amber-400' },
  KICK_FEE:     { label: 'Licenciement', icon: UserMinus, color: 'text-rose-400' },
};

// ─── Page principale ─────────────────────────────────────────────────────────

export default function MyTeam() {
  const [team, setTeam] = useState<MyTeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<FinanceTab>('roster');
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  const [kickTarget, setKickTarget] = useState<TeamMember | null>(null);
  const [kickLoading, setKickLoading] = useState(false);
  const [roleBusyUserId, setRoleBusyUserId] = useState<string | null>(null);

  type ClubEaLinkResponse = {
    syncEnabled: boolean;
    provider: string;
    link: {
      eaClubId: string;
      platform: string;
      clubName: string | null;
      verifiedAt: string | null;
    } | null;
    legacyEaClubId: string | null;
    clubPlatform: string | null;
  };

  const [eaClubPayload, setEaClubPayload] = useState<ClubEaLinkResponse | null>(null);
  const [eaClubLoadError, setEaClubLoadError] = useState<string | null>(null);
  const [eaClubSaving, setEaClubSaving] = useState(false);
  const [eaClubForm, setEaClubForm] = useState({ eaClubId: '', platform: 'PS5', clubName: '' });

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
  const avgRating =
    allMembers.length > 0
      ? allMembers.reduce((sum, m) => sum + (m.user.stats?.average_rating ?? 0), 0) / allMembers.length
      : 0;

  /** Manager désigné (`manager_id`) — promotion co-manager & licenciement. */
  const isDesignatedManager = !!user?.id && team?.manager_id === user.id;

  /** Liaison EA Clubs : manager désigné, fondateur, manager ou co-manager de club. */
  const canLinkEaClub =
    user?.role === 'ADMIN' ||
    isDesignatedManager ||
    currentMember?.club_role === 'FOUNDER' ||
    currentMember?.club_role === 'MANAGER' ||
    currentMember?.club_role === 'CO_MANAGER';

  useEffect(() => {
    if (!team?.id || !canLinkEaClub) {
      setEaClubPayload(null);
      return;
    }
    let cancelled = false;
    void api
      .get<ClubEaLinkResponse>('/clubs/my/external-link')
      .then(({ data }) => {
        if (cancelled) return;
        setEaClubPayload(data);
        setEaClubLoadError(null);
        if (data.link) {
          setEaClubForm({
            eaClubId: data.link.eaClubId,
            platform: data.link.platform,
            clubName: data.link.clubName ?? '',
          });
        } else if (data.legacyEaClubId) {
          setEaClubForm((prev) => ({
            eaClubId: data.legacyEaClubId ?? '',
            platform: (data.clubPlatform as string) || prev.platform,
            clubName: prev.clubName,
          }));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        setEaClubLoadError(typeof msg === 'string' ? msg : 'Impossible de charger la liaison EA.');
      });
    return () => {
      cancelled = true;
    };
  }, [team?.id, canLinkEaClub]);

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

  const handleSaveEaClubLink = async () => {
    const trimmedId = eaClubForm.eaClubId.trim();
    const plat = eaClubForm.platform.trim();
    if (!trimmedId || !plat) {
      toast.error('EA Club ID et plateforme sont requis.');
      return;
    }
    setEaClubSaving(true);
    try {
      const { data } = await api.patch<ClubEaLinkResponse>('/clubs/my/external-link', {
        provider: 'EA_CLUBS',
        eaClubId: trimmedId,
        platform: plat,
        clubName: eaClubForm.clubName.trim() || undefined,
      });
      setEaClubPayload(data);
      toast.success('Liaison EA club enregistrée.');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(typeof msg === 'string' ? msg : 'Enregistrement impossible.');
    } finally {
      setEaClubSaving(false);
    }
  };

  const handleVerifyEaClub = () => {
    if (!eaClubPayload?.syncEnabled) {
      toast.message('Bientôt disponible', {
        description:
          'La vérification automatique du club sera proposée lorsque la synchronisation EA FC 26 sera activée sur la plateforme.',
      });
      return;
    }
    toast.message('Vérification automatique', {
      description:
        'Le fournisseur distant confirmera bientôt la correspondance club. Vous pouvez déjà enregistrer votre EA Club ID pour préparer les imports.',
    });
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
      />

      {/* Stats Bento — aligné 3 colonnes desktop, 1 colonne mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total joueurs */}
        <div className="omjep-stat-tile group relative overflow-hidden">
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 translate-x-2 translate-y-2 text-white opacity-[0.05]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            aria-hidden
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <p className="text-xs font-semibold uppercase tracking-widest text-omjep-text-secondary">Total joueurs</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-omjep-text-primary">
            {isLoading ? '—' : players.length}
          </p>
        </div>

        {/* Staff / Managers */}
        <div className="omjep-stat-tile group relative overflow-hidden">
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 translate-x-2 translate-y-2 text-emerald-400 opacity-[0.05]"
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
          <p className="text-xs font-semibold uppercase tracking-widest text-omjep-text-secondary">Staff / Managers</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-emerald-400">
            {isLoading ? '—' : staff.length}
          </p>
        </div>

        {/* Note moy. équipe */}
        <div className="omjep-stat-tile group relative overflow-hidden">
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 translate-x-2 translate-y-2 text-yellow-500 opacity-[0.05]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            aria-hidden
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <p className="text-xs font-semibold uppercase tracking-widest text-omjep-text-secondary">Note moy. équipe</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-yellow-500">
            {isLoading ? '—' : avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Prestige du Club */}
      {team && !isLoading && (
        <PrestigeSection xp={team.xp ?? 0} prestigeLevel={team.prestige_level ?? 1} />
      )}

      {team && !isLoading && canLinkEaClub && (
        <div className="omjep-surface-elevated overflow-hidden backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-omjep-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Link2 className="h-5 w-5 shrink-0 text-omjep-mauve" aria-hidden />
              <div>
                <h3 className="text-sm font-bold tracking-wide text-omjep-text-primary">Connexion EA FC 26 Club</h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-omjep-text-secondary">
                  Liez l&apos;identifiant Pro Clubs / EA Club de votre équipe pour la synchronisation des scores (aucun
                  compte EA requis).
                </p>
              </div>
            </div>
            <span
              className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
                eaClubLoadError
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  : eaClubPayload?.link?.verifiedAt
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : eaClubPayload?.link
                      ? 'border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel))] text-omjep-text-secondary'
                      : 'border-omjep-border/60 bg-omjep-bg-panel-soft/60 text-omjep-text-muted'
              }`}
            >
              {eaClubLoadError
                ? 'Erreur'
                : eaClubPayload?.link?.verifiedAt
                  ? 'Vérifié'
                  : eaClubPayload?.link
                    ? 'Configuré'
                    : 'Non configuré'}
            </span>
          </div>

          <div className="space-y-4 px-5 py-5">
            {!eaClubPayload?.syncEnabled ? (
              <p className="rounded-lg border border-omjep-border/50 bg-omjep-bg-panel-soft/50 px-3 py-2 text-xs text-omjep-text-secondary">
                Synchronisation automatique EA FC 26 : <span className="font-semibold text-omjep-text-primary">bientôt disponible</span> sur cet
                environnement. Vous pouvez tout de même enregistrer votre EA Club ID pour préparer la reprise des
                matchs.
              </p>
            ) : null}
            {eaClubLoadError ? (
              <p className="text-sm text-rose-400" role="alert">
                {eaClubLoadError}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="ea-club-id" className="text-xs font-semibold uppercase tracking-wide text-omjep-text-muted">
                  EA Club ID / Team ID
                </label>
                <input
                  id="ea-club-id"
                  type="text"
                  value={eaClubForm.eaClubId}
                  onChange={(e) => setEaClubForm((f) => ({ ...f, eaClubId: e.target.value }))}
                  placeholder="ex. 1234567"
                  autoComplete="off"
                  className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-sm text-omjep-text-primary outline-none transition placeholder:text-omjep-text-muted focus:border-omjep-mauve/50 focus:ring-2 focus:ring-omjep-mauve/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="ea-platform" className="text-xs font-semibold uppercase tracking-wide text-omjep-text-muted">
                  Plateforme
                </label>
                <select
                  id="ea-platform"
                  value={eaClubForm.platform}
                  onChange={(e) => setEaClubForm((f) => ({ ...f, platform: e.target.value }))}
                  className="w-full cursor-pointer rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-sm text-omjep-text-primary outline-none transition focus:border-omjep-mauve/50 focus:ring-2 focus:ring-omjep-mauve/20"
                >
                  {['PS5', 'PS4', 'XBOX_SERIES', 'XBOX_ONE', 'PC', 'CROSSPLAY'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ea-club-name" className="text-xs font-semibold uppercase tracking-wide text-omjep-text-muted">
                Nom club EA (optionnel)
              </label>
              <input
                id="ea-club-name"
                type="text"
                value={eaClubForm.clubName}
                onChange={(e) => setEaClubForm((f) => ({ ...f, clubName: e.target.value }))}
                placeholder="ex. Moroccan Eagles"
                className="w-full rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-3 py-2.5 text-sm text-omjep-text-primary outline-none transition placeholder:text-omjep-text-muted focus:border-omjep-mauve/50 focus:ring-2 focus:ring-omjep-mauve/20"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveEaClubLink()}
                disabled={eaClubSaving}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-omjep-mauve/45 bg-omjep-mauve/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-omjep-text-primary transition hover:bg-omjep-mauve/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {eaClubSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Sauvegarder
              </button>
              <button
                type="button"
                onClick={handleVerifyEaClub}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-omjep-text-secondary transition hover:border-omjep-mauve/35 hover:text-omjep-text-primary"
              >
                {eaClubPayload?.syncEnabled ? 'Vérifier le club' : 'Vérifier bientôt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Équipe non trouvée */}
      {!isLoading && !team && !error && (
        <p className="py-16 text-center text-sm font-thin text-black/50 dark:text-white/40">
          Vous n'êtes actuellement membre d'aucune équipe.
        </p>
      )}

      {/* Tabs */}
      <div className="omjep-tabrail w-fit max-w-full">
        {([
          { key: 'roster' as const, label: 'Effectif', icon: Users },
          { key: 'finance' as const, label: 'Finance', icon: Wallet },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`omjep-tabrail__btn ${activeTab === key ? 'omjep-tabrail__btn--active' : ''}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: Effectif (Roster) ══════════ */}
      {activeTab === 'roster' && (
        <div className="omjep-data-shell backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-omjep-border/50 px-5 py-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-omjep-gold" />
              <h2 className="text-sm font-semibold text-omjep-text-primary">Roster actuel</h2>
            </div>
            <span className="omjep-badge">Saison 2025</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr>
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
                    <td colSpan={rosterCols} className="px-5 py-12 text-center text-sm text-gray-500">
                      Aucun membre dans cette équipe.
                    </td>
                  </tr>
                ) : (
                  allMembers.map((member) => {
                    const rowUser = member.user;
                    const { club_role } = member;
                    const role = roleConfig[club_role];
                    const RoleIcon = role.icon;
                    const position = rowUser.preferred_position;
                    const posColor = position ? positionColors[position] : 'bg-slate-500/15 text-slate-400 border-slate-500/30';
                    const posLabel = position ? positionLabel[position] : '—';
                    const matchesPlayed = rowUser.stats?.matches_played ?? 0;
                    const avgRatingPlayer = rowUser.stats?.average_rating ?? 0;
                    const pseudo = rowUser.ea_persona_name ?? `Joueur #${rowUser.id.slice(0, 6)}`;
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
                      <tr key={rowUser.id} className="group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-omjep-border/50 bg-omjep-bg-panel-soft text-xs font-bold uppercase text-omjep-text-primary shadow-inner">
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
                                  className="rounded border border-cyan-400/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-400 transition hover:bg-cyan-400/10 disabled:opacity-50"
                                >
                                  {roleBusyUserId === memberId ? '…' : 'Nommer Adjoint'}
                                </button>
                              )}
                              {showDemote && (
                                <button
                                  type="button"
                                  disabled={roleBusyUserId === memberId}
                                  onClick={() => handleDemoteCoManager(member)}
                                  className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 transition hover:bg-amber-500/15 disabled:opacity-50"
                                >
                                  {roleBusyUserId === memberId ? '…' : 'Destituer'}
                                </button>
                              )}
                              {showKickButton ? (
                                <button
                                  type="button"
                                  onClick={() => handleKickClick(member)}
                                  className="ml-auto flex items-center gap-2 rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-mono text-[10px] uppercase text-red-400 transition-all hover:bg-red-500/20"
                                >
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                                  Licencier (5k OC)
                                </button>
                              ) : memberId === user?.id ? (
                                <span className="font-mono text-[10px] text-slate-700">-- MY SELF --</span>
                              ) : (
                                !showPromote && !showDemote && (
                                  <span className="text-xs text-slate-600">—</span>
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

          <div className="flex items-center justify-between border-t border-omjep-border/50 px-5 py-3">
            <span className="text-xs text-omjep-text-muted">
              {isLoading ? '…' : `${allMembers.length} membre${allMembers.length > 1 ? 's' : ''} au total`}
            </span>
            <span className="text-xs text-omjep-text-muted/80">Données live — v1.0</span>
          </div>
        </div>
      )}

      {/* ══════════ TAB: Finance ══════════ */}
      {activeTab === 'finance' && (
        <>
          {/* Budget overview cards */}
          {finance && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="omjep-surface-card border-emerald-500/20 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Budget</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-emerald-400">{formatCurrency(finance?.budget ?? 0, 'OC')}</span>
              </div>
              <div className="omjep-surface-card border-blue-500/20 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Contrats</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-blue-400">{finance?.contracts?.length ?? 0}</span>
              </div>
              <div className="omjep-surface-card border-amber-500/25 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Masse salariale</span>
                </div>
                <span className="text-2xl font-black tabular-nums text-amber-400">
                  {formatCurrency((finance?.contracts ?? []).reduce((s, c) => s + (c.salary ?? 0), 0), 'OC')}
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
              <div className="omjep-data-shell overflow-hidden">
                <div className="flex items-center gap-2 border-b border-omjep-border/50 px-6 py-4">
                  <TrendingUp className="h-4 w-4 text-omjep-gold" />
                  <h2 className="text-sm font-semibold text-omjep-text-primary">Dernières transactions</h2>
                </div>
                <div className="max-h-[420px] divide-y divide-omjep-border/40 overflow-y-auto">
                  {(finance?.transactions ?? []).length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-600">
                      Aucune transaction enregistrée.
                    </div>
                  ) : (
                    (finance?.transactions ?? []).map((tx) => {
                      const cfg =
                        txTypeConfig[tx.type as TransactionType] ?? {
                          label: String(tx.type),
                          icon: FileText,
                          color: 'text-slate-400',
                        };
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
              <div className="omjep-data-shell overflow-hidden">
                <div className="flex items-center gap-2 border-b border-omjep-border/50 px-6 py-4">
                  <FileText className="h-4 w-4 text-omjep-gold" />
                  <h2 className="text-sm font-semibold text-omjep-text-primary">Contrats joueurs</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr>
                        {['Joueur', 'Salaire /sem', 'Clause', 'Expiration'].map((col) => (
                          <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-omjep-text-muted">
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
                          const expired = new Date(c.end_date) < new Date();
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
                                <span className="text-sm font-bold text-amber-400 tabular-nums">{formatCurrency(c.salary ?? 0, 'OC')}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-sm font-bold text-blue-400 tabular-nums">{formatCurrency(c.release_clause ?? 0, 'OC')}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`text-xs font-semibold ${expired ? 'text-red-400' : 'text-slate-400'}`}>
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


      {/* Confirmation licenciement */}
      {kickTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kick-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1018] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10">
                <UserMinus className="h-5 w-5 text-rose-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="kick-modal-title" className="text-lg font-bold text-white">
                  Licencier ce joueur ?
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  <span className="font-semibold text-white">
                    {kickTarget.user.ea_persona_name ?? `Joueur #${kickTarget.user_id.slice(0, 6)}`}
                  </span>{' '}
                  sera retiré de l&apos;effectif. Le budget du club sera débité de{' '}
                  <span className="font-mono font-semibold tabular-nums text-amber-400">
                    {KICK_FEE_OC.toLocaleString('fr-FR')} OC
                  </span>{' '}
                  (frais administratifs).
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Cette action est immédiate. Le joueur recevra une notification.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={kickLoading}
                onClick={() => setKickTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={kickLoading}
                onClick={() => void confirmKickMember()}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50"
              >
                {kickLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                Confirmer ({KICK_FEE_OC.toLocaleString('fr-FR')} OC)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </TeamErrorBoundary>
  );
}
