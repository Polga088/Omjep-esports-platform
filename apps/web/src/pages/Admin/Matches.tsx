import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Swords, Loader2, X, CheckCircle2, AlertCircle,
  Filter, ChevronDown, Trophy, Clock, Award, Plus, Trash2, Goal, Globe, Pencil,
  ShieldAlert, CalendarClock, LayoutList, Network, Wrench,
} from 'lucide-react';
import api from '@/lib/api';
import type { AxiosResponse } from 'axios';
import SyncPreviewModal from '@/components/SyncPreviewModal';
import TacticalEmptyState from '@/components/TacticalEmptyState';
import TournamentBrackets, { type MatchBrief } from '@/pages/Dashboard/TournamentBrackets';

const BRACKET_PLACEHOLDER_NAME = 'OMJEP_BRACKET_TBD';

function isCupType(t: string | null | undefined): boolean {
  return String(t ?? '')
    .trim()
    .toUpperCase() === 'CUP';
}

function isChampionsType(t: string | null | undefined): boolean {
  return String(t ?? '')
    .trim()
    .toUpperCase() === 'CHAMPIONS';
}

function labelTeamName(name: string) {
  return name === BRACKET_PLACEHOLDER_NAME ? 'À déterminer' : name;
}

const extractApiList = (res: AxiosResponse<unknown>): unknown[] => {
  const d = res.data as Record<string, unknown> | unknown[] | null | undefined;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && Array.isArray((d as { data?: unknown[] }).data)) {
    return (d as { data: unknown[] }).data;
  }
  return [];
};

const apiErrMessage = (err: unknown, fallback: string) => {
  const ax = err as { response?: { data?: { message?: string | string[] } } };
  const m = ax.response?.data?.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m) && m[0]) return String(m[0]);
  return fallback;
};

const toDatetimeLocalValue = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MATCH_FORM_STATUSES = [
  'SCHEDULED',
  'LIVE',
  'PENDING',
  'PLAYED',
  'FINISHED',
  'VALIDATED',
  'CANCELLED',
  'DISPUTED',
  'DISPUTE',
] as const;
type MatchStatus = (typeof MATCH_FORM_STATUSES)[number]

function toMatchBrief(m: Match): MatchBrief {
  return {
    id: m.id,
    round: m.round,
    status: m.status,
    home_score: m.home_score,
    away_score: m.away_score,
    homeTeam: {
      id: m.homeTeam.id,
      name: labelTeamName(m.homeTeam.name),
      logo_url: m.homeTeam.logo_url ?? null,
    },
    awayTeam: {
      id: m.awayTeam.id,
      name: labelTeamName(m.awayTeam.name),
      logo_url: m.awayTeam.logo_url ?? null,
    },
  };
}

function buildBracketRounds(matches: Match[]): { name: string; matches: MatchBrief[] }[] {
  const cupBracket = matches.filter(
    (m) =>
      m.bracket_round != null &&
      (m.competition?.type === 'CUP' || m.competition?.type === 'CHAMPIONS'),
  );
  if (cupBracket.length === 0) return [];

  const byRound = new Map<number, Match[]>();
  for (const m of cupBracket) {
    const r = m.bracket_round ?? 0;
    if (!byRound.has(r)) byRound.set(r, []);
    byRound.get(r)!.push(m);
  }

  const roundNums = [...byRound.keys()].sort((a, b) => a - b);
  return roundNums.map((rNum) => {
    const list = byRound.get(rNum)!.slice().sort((a, b) => (a.bracket_index ?? 0) - (b.bracket_index ?? 0));
    const name = list[0]?.round?.trim() || `Tour ${rNum + 1}`;
    return { name, matches: list.map(toMatchBrief) };
  });
}

interface Team {
  id: string;
  name: string;
  logo_url?: string | null;
}

interface CompetitionTeamRow {
  team: { id: string; name: string; logo_url?: string | null };
}

interface Competition {
  id: string;
  name: string;
  type: string; // LEAGUE | CUP | CHAMPIONS
  teams?: CompetitionTeamRow[];
}

interface MatchEvent {
  player: { id: string; ea_persona_name: string | null };
  team: { id: string; name: string };
  type: 'GOAL' | 'ASSIST';
}

interface Match {
  id: string;
  round: string | null;
  competition_id?: string | null;
  bracket_round?: number | null;
  bracket_index?: number | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  played_at: string | null;
  startTime?: string | null;
  competition: Competition | null;
  homeTeam: Team;
  awayTeam: Team;
  events?: MatchEvent[];
}

interface TeamMember {
  user_id: string;
  ea_persona_name: string | null;
}

interface EventDraft {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  type: 'GOAL' | 'ASSIST';
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  SCHEDULED: {
    label: 'Programmé',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
  },
  LIVE: {
    label: 'En direct',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
  PLAYED: {
    label: 'Terminé',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  FINISHED: {
    label: 'Validé',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  CANCELLED: {
    label: 'Annulé',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
  DISPUTED: {
    label: 'Litige',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  PENDING: {
    label: 'En attente',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    dot: 'bg-violet-400',
  },
  VALIDATED: {
    label: 'Validé (legacy)',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  DISPUTE: {
    label: 'Litige (legacy)',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
  },
};

export default function AdminMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompetition, setFilterCompetition] = useState('');
  const [statusFilter, setStatusFilter] = useState<MatchStatus | ''>('')
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'PLAYED'>('SCHEDULED');
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');
  const [listLayout, setListLayout] = useState<'cards' | 'table'>('table');

  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [events, setEvents] = useState<EventDraft[]>([]);
  const [homeMembers, setHomeMembers] = useState<TeamMember[]>([]);
  const [awayMembers, setAwayMembers] = useState<TeamMember[]>([]);
  const [addEventSide, setAddEventSide] = useState<'home' | 'away' | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncPreviewMatch, setSyncPreviewMatch] = useState<Match | null>(null);
  const [syncedMatchIds, setSyncedMatchIds] = useState<Set<string>>(new Set());

  // Correction rétroactive
  const [correctModal, setCorrectModal] = useState<Match | null>(null);
  const [correctHome, setCorrectHome] = useState('');
  const [correctAway, setCorrectAway] = useState('');
  const [correcting, setCorrecting] = useState(false);

  // Litige & reprogrammation
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<Match | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [repairingBracket, setRepairingBracket] = useState(false);

  const [formModal, setFormModal] = useState<'create' | 'edit' | null>(null);
  const [formCompetitionId, setFormCompetitionId] = useState('');
  const [formHomeId, setFormHomeId] = useState('');
  const [formAwayId, setFormAwayId] = useState('');
  const [formRound, setFormRound] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formStatus, setFormStatus] = useState<string>('SCHEDULED');
  const [formHomeScore, setFormHomeScore] = useState('');
  const [formAwayScore, setFormAwayScore] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const modalRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const skipFilterReloadRef = useRef(true);

  const loadMatchesForFilter = async (competitionId: string) => {
    const fid = competitionId.trim();
    const url = fid
      ? `/admin/matches?competition_id=${encodeURIComponent(fid)}`
      : '/admin/matches';
    const matchesRes = await api.get(url);
    setMatches(extractApiList(matchesRes) as Match[]);
  };

  useEffect(() => {
    const c = searchParams.get('competition')?.trim();
    const view = searchParams.get('view');
    if (c) setFilterCompetition(c);
    if (view === 'bracket') setViewMode('bracket');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const parts: string[] = [];
      try {
        const [matchesRes, compsRes] = await Promise.allSettled([
          api.get('/admin/matches'),
          api.get('/admin/competitions'),
        ]);
        if (!cancelled) {
          if (compsRes.status === 'fulfilled') {
            const compsList = extractApiList(compsRes.value) as Record<string, unknown>[];
            setCompetitions(
              compsList.map((c) => ({
                id: String(c.id).trim(),
                name: String(c.name ?? ''),
                type: String(c.type ?? '').toUpperCase(),
                teams: Array.isArray(c.teams) ? (c.teams as CompetitionTeamRow[]) : [],
              })),
            );
          } else {
            parts.push(`Compétitions : ${apiErrMessage(compsRes.reason, 'chargement impossible.')}`);
          }
          if (matchesRes.status === 'fulfilled') {
            setMatches(extractApiList(matchesRes.value) as Match[]);
          } else {
            parts.push(`Matchs : ${apiErrMessage(matchesRes.reason, 'chargement impossible.')}`);
          }
          if (parts.length) setError(parts.join(' '));
        }
      } catch (e) {
        if (!cancelled) setError(apiErrMessage(e, 'Impossible de charger les données.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (skipFilterReloadRef.current) {
      skipFilterReloadRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadMatchesForFilter(filterCompetition);
      } catch (e) {
        if (!cancelled) setError(apiErrMessage(e, 'Impossible de charger les matchs.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterCompetition]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const compsRes = await api.get('/admin/competitions');
      const compsList = extractApiList(compsRes) as Record<string, unknown>[];
      setCompetitions(
        compsList.map((c) => ({
          id: String(c.id).trim(),
          name: String(c.name ?? ''),
          type: String(c.type ?? '').toUpperCase(),
          teams: Array.isArray(c.teams) ? (c.teams as CompetitionTeamRow[]) : [],
        })),
      );
      await loadMatchesForFilter(filterCompetition);
    } catch (e) {
      setError(apiErrMessage(e, 'Impossible de charger les données.'));
    } finally {
      setLoading(false);
    }
  };

  const closeFormModal = () => {
    setFormModal(null);
    setEditingMatchId(null);
    setFormSaving(false);
  };

  const openCreateModal = () => {
    setFormModal('create');
    setEditingMatchId(null);
    setFormCompetitionId(filterCompetition.trim());
    setFormHomeId('');
    setFormAwayId('');
    setFormRound('');
    setFormScheduledAt('');
    setFormStatus('SCHEDULED');
    setFormHomeScore('');
    setFormAwayScore('');
    setError('');
  };

  const openEditModal = (m: Match, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFormModal('edit');
    setEditingMatchId(m.id);
    setFormCompetitionId(String(m.competition?.id ?? m.competition_id ?? '').trim());
    setFormHomeId(m.homeTeam.id);
    setFormAwayId(m.awayTeam.id);
    setFormRound(m.round ?? '');
    setFormScheduledAt(toDatetimeLocalValue(m.startTime ?? null));
    setFormStatus(m.status);
    setFormHomeScore(m.home_score != null ? String(m.home_score) : '');
    setFormAwayScore(m.away_score != null ? String(m.away_score) : '');
    setError('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompetitionId.trim() || !formHomeId || !formAwayId) {
      setError('Compétition et deux équipes sont requis.');
      return;
    }
    if (formHomeId === formAwayId) {
      setError('Les deux équipes doivent être différentes.');
      return;
    }
    setFormSaving(true);
    setError('');
    try {
      if (formModal === 'create') {
        await api.post('/admin/matches', {
          competition_id: formCompetitionId.trim(),
          home_team_id: formHomeId,
          away_team_id: formAwayId,
          round: formRound.trim() || undefined,
          scheduled_at: formScheduledAt
            ? new Date(formScheduledAt).toISOString()
            : undefined,
          status: formStatus,
        });
        setSuccess('Rencontre créée.');
      } else if (editingMatchId) {
        const payload: Record<string, unknown> = {
          competition_id: formCompetitionId.trim(),
          home_team_id: formHomeId,
          away_team_id: formAwayId,
          round: formRound.trim(),
          status: formStatus,
          scheduled_at: formScheduledAt
            ? new Date(formScheduledAt).toISOString()
            : null,
        };
        const hs = parseInt(formHomeScore, 10);
        const as = parseInt(formAwayScore, 10);
        if (formHomeScore !== '' && formAwayScore !== '' && !Number.isNaN(hs) && !Number.isNaN(as)) {
          payload.home_score = hs;
          payload.away_score = as;
        }
        await api.patch(`/admin/matches/${editingMatchId}`, payload);
        setSuccess('Rencontre mise à jour.');
      }
      closeFormModal();
      await fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(apiErrMessage(err, 'Enregistrement impossible.'));
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteMatch = async (m: Match, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Supprimer définitivement ce match ? (${m.homeTeam.name} vs ${m.awayTeam.name})`,
      )
    ) {
      return;
    }
    setDeletingId(m.id);
    setError('');
    try {
      await api.delete(`/admin/matches/${m.id}`);
      setSuccess('Match supprimé.');
      await fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(apiErrMessage(err, 'Suppression impossible.'));
    } finally {
      setDeletingId(null);
    }
  };

  const filterId = filterCompetition.trim();
  const matchCompetitionId = (m: Match) =>
    String(m.competition?.id ?? m.competition_id ?? '').trim();

  const filtered = matches.filter((m) => {
    if (filterId && matchCompetitionId(m) !== filterId) return false;
    if (statusFilter && m.status !== statusFilter) return false
    if (activeTab === 'SCHEDULED') return m.status === 'SCHEDULED' || m.status === 'LIVE';
    return m.status !== 'SCHEDULED' && m.status !== 'LIVE';
  });

  /** Matchs de la compétition sélectionnée uniquement (arbre bracket). */
  const matchesForBracket = filterId
    ? matches.filter((m) => matchCompetitionId(m) === filterId)
    : [];

  const metaForFilter = filterId ? competitions.find((c) => c.id === filterId) : undefined;
  const cupFromList = metaForFilter ? isCupType(metaForFilter.type) : false;
  const cupFromMatches = matchesForBracket.some((m) => isCupType(m.competition?.type));
  const championsFromList = metaForFilter ? isChampionsType(metaForFilter.type) : false;
  const championsFromMatches = matchesForBracket.some((m) =>
    isChampionsType(m.competition?.type),
  );
  const showBracketView = Boolean(
    filterId &&
      (cupFromList || cupFromMatches || championsFromList || championsFromMatches),
  );

  const bracketRounds = buildBracketRounds(matchesForBracket);
  const hasMatchesWithoutBracketLayout =
    showBracketView &&
    matchesForBracket.length > 0 &&
    matchesForBracket.some((m) => m.bracket_round == null || m.bracket_index == null);

  const handleRepairBracketPositions = async () => {
    if (!filterId || !showBracketView) return;
    setRepairingBracket(true);
    setError('');
    try {
      const res = await api.post('/admin/matches/repair-bracket-positions', {
        competition_id: filterId,
      });
      setSuccess(res.data.message ?? 'Positions mises à jour.');
      await loadMatchesForFilter(filterCompetition);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erreur lors de la réparation des positions.';
      setError(typeof msg === 'string' ? msg : 'Erreur lors de la réparation.');
    } finally {
      setRepairingBracket(false);
    }
  };

  const handleBracketMatchClick = (brief: MatchBrief) => {
    const full = matches.find((x) => x.id === brief.id);
    if (!full) return;
    if (full.status === 'SCHEDULED' || full.status === 'LIVE') void openScoreModal(full);
    else if (full.status === 'PLAYED') openCorrectModal(full);
  };

  const openScoreModal = async (match: Match) => {
    setScoreModal(match);
    setHomeScore('');
    setAwayScore('');
    setEvents([]);
    setAddEventSide(null);
    setError('');

    try {
      const [homeRes, awayRes] = await Promise.allSettled([
        api.get(`/teams/${match.homeTeam.id}`),
        api.get(`/teams/${match.awayTeam.id}`),
      ]);

      const extractMembers = (res: PromiseSettledResult<any>): TeamMember[] => {
        if (res.status !== 'fulfilled') return [];
        const team = res.value.data;
        return (team.members ?? []).map((m: any) => ({
          user_id: m.user?.id ?? m.user_id,
          ea_persona_name: m.user?.ea_persona_name ?? null,
        }));
      };

      setHomeMembers(extractMembers(homeRes));
      setAwayMembers(extractMembers(awayRes));
    } catch {
      setHomeMembers([]);
      setAwayMembers([]);
    }
  };

  const addEvent = (member: TeamMember, side: 'home' | 'away', type: 'GOAL' | 'ASSIST') => {
    if (!scoreModal) return;
    const team = side === 'home' ? scoreModal.homeTeam : scoreModal.awayTeam;
    setEvents((prev) => [
      ...prev,
      {
        player_id: member.user_id,
        player_name: member.ea_persona_name ?? 'Joueur',
        team_id: team.id,
        team_name: team.name,
        type,
      },
    ]);
    setAddEventSide(null);
  };

  const removeEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreModal) return;

    const hs = parseInt(homeScore, 10);
    const as = parseInt(awayScore, 10);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
      setError('Les scores doivent être des nombres positifs.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/admin/matches/${scoreModal.id}/score`, {
        home_score: hs,
        away_score: as,
        events: events.map((ev) => ({
          player_id: ev.player_id,
          team_id: ev.team_id,
          type: ev.type,
        })),
      });
      setSuccess('Résultat enregistré avec succès !');
      setScoreModal(null);
      await fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la validation.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCorrectModal = (match: Match) => {
    setCorrectModal(match);
    setCorrectHome(String(match.home_score ?? ''));
    setCorrectAway(String(match.away_score ?? ''));
    setError('');
  };

  const handleCorrectScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctModal) return;

    const hs = parseInt(correctHome, 10);
    const as = parseInt(correctAway, 10);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
      setError('Les scores doivent être des nombres positifs.');
      return;
    }

    setCorrecting(true);
    setError('');
    try {
      const res = await api.patch(`/admin/matches/${correctModal.id}/correct-score`, {
        home_score: hs,
        away_score: as,
      });
      setSuccess(res.data.message ?? 'Score corrigé avec succès !');
      setCorrectModal(null);
      await fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la correction.');
    } finally {
      setCorrecting(false);
    }
  };

  const handleDisputeMatch = async (match: Match, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Confirmer le litige pour "${match.homeTeam.name} vs ${match.awayTeam.name}" ?`)) return;
    setDisputingId(match.id);
    setError('');
    try {
      const res = await api.patch(`/admin/matches/${match.id}/dispute`);
      setSuccess(res.data.message ?? 'Match placé en litige.');
      await fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors du litige.');
    } finally {
      setDisputingId(null);
    }
  };

  const openRescheduleModal = (match: Match, e: React.MouseEvent) => {
    e.stopPropagation();
    setRescheduleModal(match);
    setScheduledAt('');
    setError('');
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModal || !scheduledAt) return;
    setRescheduling(true);
    setError('');
    try {
      const res = await api.patch(`/admin/matches/${rescheduleModal.id}/reschedule`, {
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      setSuccess(res.data.message ?? 'Match reprogrammé.');
      setRescheduleModal(null);
      await fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la reprogrammation.');
    } finally {
      setRescheduling(false);
    }
  };

  const handleSyncCompleted = async (matchId: string) => {
    setSyncedMatchIds((prev) => new Set(prev).add(matchId));
    setSuccess('Match importé via ProClubs.io !');
    await fetchData();
    setTimeout(() => setSuccess(''), 4000);
  };

  const selectedCompName = filterId
    ? competitions.find((c) => c.id === filterId)?.name ?? 'Compétition'
    : 'Toutes les compétitions';

  const scheduledCount = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'LIVE').length;
  const playedCount = matches.filter((m) => m.status !== 'SCHEDULED' && m.status !== 'LIVE').length;

  const formatMatchWhen = (m: Match) => {
    const t = m.startTime ?? m.played_at;
    if (!t) return '—';
    return new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  };

  const formTeamChoices =
    competitions.find((c) => c.id === formCompetitionId.trim())?.teams ?? [];

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <p className="text-sm text-slate-500">Chargement des matchs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center border border-amber-400/20">
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
            Matches
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">
            Consultez, filtrez et gérez les rencontres par compétition et statut.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 text-sm font-semibold text-amber-300 hover:bg-amber-400/15 hover:border-amber-400/40 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Nouvelle rencontre
          </button>

          {/* Competition filter */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/15 bg-white/[0.03] text-sm text-slate-300 hover:border-amber-400/30 hover:bg-white/[0.05] transition-all duration-200"
            >
              <Filter className="w-4 h-4 text-amber-400/60" />
              <span className="max-w-[180px] truncate">{selectedCompName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-amber-400/15 bg-[#0a0f1e] shadow-2xl shadow-black/50 overflow-hidden z-20 animate-[fadeIn_0.15s_ease-out]">
                <button
                  type="button"
                  onClick={() => { setFilterCompetition(''); setFilterOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    !filterId ? 'text-amber-400 bg-amber-400/5' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                  }`}
                >
                  Toutes les compétitions
                </button>
                {competitions.map((comp) => (
                  <button
                    type="button"
                    key={comp.id}
                    onClick={() => { setFilterCompetition(String(comp.id).trim()); setFilterOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm border-t border-white/[0.03] transition-colors ${
                      filterId === String(comp.id).trim() ? 'text-amber-400 bg-amber-400/5' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate block">{comp.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as MatchStatus) || '')}
            className="rounded-xl border border-amber-400/15 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300 hover:border-amber-400/30"
          >
            <option value="">Tous les statuts</option>
            {MATCH_FORM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && !scoreModal && !formModal && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[fadeIn_0.3s_ease-out]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Vue liste / bracket */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-amber-400/10 w-fit">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Liste
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bracket')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'bracket'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Bracket
          </button>
        </div>
        {viewMode === 'bracket' && !filterId && (
          <p className="text-xs text-slate-500">
            Sélectionnez une compétition dans le filtre ci-dessus pour afficher l’arbre (idéalement une <span className="text-amber-400/80">coupe</span>).
          </p>
        )}
        {viewMode === 'bracket' && filterId && !showBracketView && (
          <p className="text-xs text-amber-400/85">
            Cette compétition n’est pas une coupe — l’arbre à élimination directe ne s’affiche pas.
          </p>
        )}
      </div>

      {/* Tabs (liste uniquement) */}
      {viewMode === 'list' && (
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-amber-400/10 w-fit">
        <button
          onClick={() => setActiveTab('SCHEDULED')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'SCHEDULED'
              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          À jouer
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'SCHEDULED' ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.05] text-slate-600'
          }`}>
            {scheduledCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('PLAYED')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'PLAYED'
              ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Résultats
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'PLAYED' ? 'bg-amber-400/20 text-amber-400' : 'bg-white/[0.05] text-slate-600'
          }`}>
            {playedCount}
          </span>
        </button>
      </div>
      )}

      {viewMode === 'list' && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-amber-400/10 w-fit">
          <button
            type="button"
            onClick={() => setListLayout('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              listLayout === 'table'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            Tableau
          </button>
          <button
            type="button"
            onClick={() => setListLayout('cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              listLayout === 'cards'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 border border-transparent'
            }`}
          >
            Cartes
          </button>
        </div>
      )}

      {/* Bracket — matchs filtrés par la compétition sélectionnée (API + état local) */}
      {viewMode === 'bracket' && showBracketView && (
        <div className="rounded-2xl border border-amber-400/10 bg-white/[0.02] p-4 sm:p-6">
          {matchesForBracket.length === 0 ? (
            <TacticalEmptyState
              className="border-0 bg-transparent shadow-none"
              icon={Swords}
              title="Aucun match détecté"
              description="Aucun match pour cette compétition. Vérifiez le filtre ou créez des matchs."
            />
          ) : (
            <>
              {(bracketRounds.length === 0 || hasMatchesWithoutBracketLayout) && (
                <div className="mb-6 flex flex-col items-center gap-4 rounded-xl border border-dashed border-amber-400/20 bg-amber-400/[0.03] px-4 py-8">
                  <p className="text-center text-sm text-slate-400 max-w-md">
                    {bracketRounds.length === 0
                      ? 'Les matchs existent mais ne sont pas encore placés dans l’arbre (bracket_round / bracket_index manquants). Vous pouvez les déduire des libellés de tour.'
                      : 'Certains matchs n’ont pas encore de position bracket — complétez pour un arbre cohérent.'}
                  </p>
                  <button
                    type="button"
                    disabled={repairingBracket}
                    onClick={() => void handleRepairBracketPositions()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
                  >
                    {repairingBracket ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wrench className="w-4 h-4" />
                    )}
                    Générer les positions de l’arbre
                  </button>
                </div>
              )}
              {bracketRounds.length > 0 && (
                <TournamentBrackets rounds={bracketRounds} onMatchClick={handleBracketMatchClick} />
              )}
            </>
          )}
        </div>
      )}

      {/* Match list */}
      {viewMode === 'list' && filtered.length === 0 ? (
        <TacticalEmptyState
          icon={Swords}
          title="Aucun match détecté"
          description={
            activeTab === 'SCHEDULED'
              ? 'Aucun match programmé pour ce filtre.'
              : 'Aucun résultat disponible pour ce filtre.'
          }
        />
      ) : viewMode === 'list' && listLayout === 'table' ? (
        <div className="rounded-2xl border border-amber-400/10 bg-white/[0.02] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm text-slate-300">
            <thead className="border-b border-white/[0.06] bg-white/[0.02] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Compétition</th>
                <th className="px-4 py-3 w-28">Tour</th>
                <th className="px-4 py-3">Domicile</th>
                <th className="px-4 py-3 w-24 text-center">Score</th>
                <th className="px-4 py-3">Extérieur</th>
                <th className="px-4 py-3 w-32">Statut</th>
                <th className="px-4 py-3 w-36">Date</th>
                <th className="px-4 py-3 w-52 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((match) => {
                const statusCfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.SCHEDULED;
                const isScheduled = match.status === 'SCHEDULED';
                const isPlayed = match.status === 'PLAYED';
                const isDisputed = match.status === 'DISPUTED';
                return (
                  <tr
                    key={match.id}
                    onClick={isScheduled ? () => void openScoreModal(match) : undefined}
                    className={isScheduled ? 'cursor-pointer hover:bg-white/[0.03]' : 'hover:bg-white/[0.02]'}
                  >
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="truncate block text-slate-400 text-xs">
                        {match.competition?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{match.round ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-white max-w-[140px] truncate">{match.homeTeam.name}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-white font-semibold">
                      {match.home_score != null && match.away_score != null
                        ? `${match.home_score} – ${match.away_score}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-white max-w-[140px] truncate">{match.awayTeam.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatMatchWhen(match)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => openEditModal(match, e)}
                            title="Modifier"
                            className="inline-flex items-center gap-1.5 p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-amber-400 hover:border-amber-400/30"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline text-[11px] font-semibold">Éditer</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === match.id}
                          onClick={(e) => void handleDeleteMatch(match, e)}
                            title="Supprimer"
                            className="inline-flex items-center gap-1.5 p-2 rounded-lg border border-red-500/15 text-red-400/70 hover:text-red-400 hover:border-red-500/40 disabled:opacity-40"
                        >
                          {deletingId === match.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                            <span className="hidden lg:inline text-[11px] font-semibold">Suppr.</span>
                        </button>
                        {isScheduled && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSyncPreviewMatch(match);
                            }}
                            title="Importer via ProClubs.io"
                            className="p-2 rounded-lg border border-emerald-400/15 text-emerald-400/70 hover:text-emerald-400"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isPlayed && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openCorrectModal(match); }}
                            title="Corriger le score"
                            className="p-2 rounded-lg border border-orange-400/15 text-orange-400/70 hover:text-orange-400"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(isPlayed || isScheduled) && (
                          <button
                            type="button"
                            disabled={disputingId === match.id}
                            onClick={(e) => handleDisputeMatch(match, e)}
                            title="Litige"
                            className="p-2 rounded-lg border border-red-500/15 text-red-400/70 hover:text-red-400 disabled:opacity-40"
                          >
                            {disputingId === match.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {isDisputed && (
                          <button
                            type="button"
                            onClick={(e) => openRescheduleModal(match, e)}
                            title="Reprogrammer"
                            className="p-2 rounded-lg border border-cyan-400/15 text-cyan-400/70 hover:text-cyan-400"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filtered.map((match) => {
            const statusCfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.SCHEDULED;
            const isScheduled = match.status === 'SCHEDULED';
            const isPlayed = match.status === 'PLAYED';
            const isDisputed = match.status === 'DISPUTED';

            return (
              <div
                key={match.id}
                onClick={isScheduled ? () => openScoreModal(match) : undefined}
                className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                  isScheduled
                    ? 'border-amber-400/[0.08] bg-gradient-to-r from-white/[0.02] to-transparent hover:border-amber-400/25 hover:bg-white/[0.04] cursor-pointer hover:shadow-lg hover:shadow-amber-400/[0.04]'
                    : 'border-white/[0.05] bg-white/[0.01]'
                }`}
              >
                {/* Competition badge */}
                {match.competition && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] shrink-0 min-w-[120px]">
                    <Trophy className="w-3 h-3 text-amber-400/50" />
                    <span className="text-[11px] text-slate-500 font-medium truncate">{match.competition.name}</span>
                  </div>
                )}

                {/* Round */}
                {match.round && (
                  <span className="hidden md:block text-[11px] text-slate-600 font-medium shrink-0 w-24 text-center">
                    {match.round}
                  </span>
                )}

                {/* Match card */}
                <div className="flex-1 flex items-center justify-center gap-3 sm:gap-5">
                  {/* Home team */}
                  <div className="flex items-center gap-2.5 flex-1 justify-end">
                    <span className="text-sm font-semibold text-white truncate text-right">{match.homeTeam.name}</span>
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      {match.homeTeam.logo_url ? (
                        <img src={match.homeTeam.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                      ) : (
                        match.homeTeam.name.slice(0, 2)
                      )}
                    </div>
                  </div>

                  {/* Score / VS */}
                  <div className="shrink-0 min-w-[70px] flex items-center justify-center gap-1.5">
                    {match.home_score != null && match.away_score != null ? (
                      <>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                          <span className="text-base font-black text-white tabular-nums">{match.home_score}</span>
                          <span className="text-xs text-slate-600 font-medium">-</span>
                          <span className="text-base font-black text-white tabular-nums">{match.away_score}</span>
                        </div>
                        {syncedMatchIds.has(match.id) && (
                          <div
                            className="w-5 h-5 rounded-md bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center shrink-0"
                            title="Importé via ProClubs.io"
                          >
                            <Globe className="w-3 h-3 text-emerald-400" />
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">VS</span>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      {match.awayTeam.logo_url ? (
                        <img src={match.awayTeam.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                      ) : (
                        match.awayTeam.name.slice(0, 2)
                      )}
                    </div>
                    <span className="text-sm font-semibold text-white truncate">{match.awayTeam.name}</span>
                  </div>
                </div>

                {/* Status badge */}
                <span className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border shrink-0 ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${match.status === 'LIVE' ? 'animate-pulse' : ''}`} />
                  {statusCfg.label}
                </span>

                <button
                  type="button"
                  onClick={(e) => openEditModal(match, e)}
                  title="Modifier la rencontre"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-amber-400 hover:border-amber-400/25 transition-all duration-200 shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden xl:inline text-[11px] font-semibold">Modifier</span>
                </button>
                <button
                  type="button"
                  disabled={deletingId === match.id}
                  onClick={(e) => void handleDeleteMatch(match, e)}
                  title="Supprimer le match"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/15 bg-red-500/[0.04] text-red-400/70 hover:text-red-400 hover:border-red-500/30 transition-all duration-200 shrink-0 disabled:opacity-40"
                >
                  {deletingId === match.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span className="hidden xl:inline text-[11px] font-semibold">Supprimer</span>
                </button>

                {/* ProClubs import button */}
                {isScheduled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSyncPreviewMatch(match);
                    }}
                    title="Importer via ProClubs.io"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-400/30 hover:bg-emerald-400/10 transition-all duration-200 shrink-0"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="hidden xl:inline text-[11px] font-semibold">ProClubs.io</span>
                  </button>
                )}

                {/* Score correction button — PLAYED matches only */}
                {isPlayed && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openCorrectModal(match); }}
                    title="Corriger le score"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-400/15 bg-orange-400/[0.04] text-orange-400/70 hover:text-orange-400 hover:border-orange-400/30 hover:bg-orange-400/10 transition-all duration-200 shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="hidden xl:inline text-[11px] font-semibold">Corriger</span>
                  </button>
                )}

                {/* Dispute button — PLAYED or SCHEDULED matches */}
                {(isPlayed || isScheduled) && (
                  <button
                    type="button"
                    disabled={disputingId === match.id}
                    onClick={(e) => handleDisputeMatch(match, e)}
                    title="Signaler un litige"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/15 bg-red-500/[0.04] text-red-400/70 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-200 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {disputingId === match.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ShieldAlert className="w-4 h-4" />}
                    <span className="hidden xl:inline text-[11px] font-semibold">Litige</span>
                  </button>
                )}

                {/* Reschedule button — DISPUTED matches only */}
                {isDisputed && (
                  <button
                    type="button"
                    onClick={(e) => openRescheduleModal(match, e)}
                    title="Reprogrammer le match"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] text-cyan-400/70 hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/10 transition-all duration-200 shrink-0"
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span className="hidden xl:inline text-[11px] font-semibold">Reprogrammer</span>
                  </button>
                )}

                {/* Click hint for scheduled matches */}
                {isScheduled && (
                  <span className="hidden lg:block text-[10px] text-amber-400/40 font-medium group-hover:text-amber-400/80 transition-colors shrink-0">
                    Saisir le score →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Modal création / édition rencontre */}
      {formModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !formSaving && closeFormModal()}
            aria-hidden
          />
          <div className="relative w-full max-w-lg bg-[#0a0f1e] border border-amber-400/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-400/10 bg-gradient-to-r from-amber-400/[0.03] to-transparent">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                {formModal === 'create' ? 'Nouvelle rencontre' : 'Modifier la rencontre'}
              </h2>
              <button
                type="button"
                disabled={formSaving}
                onClick={() => closeFormModal()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleFormSubmit(e)} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="admin-match-comp" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Compétition
                </label>
                <select
                  id="admin-match-comp"
                  value={formCompetitionId}
                  onChange={(e) => setFormCompetitionId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30"
                >
                  <option value="">— Choisir —</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-match-home" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Domicile
                  </label>
                  <select
                    id="admin-match-home"
                    value={formHomeId}
                    onChange={(e) => setFormHomeId(e.target.value)}
                    required
                    disabled={!formCompetitionId.trim() || formTeamChoices.length === 0}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30 disabled:opacity-40"
                  >
                    <option value="">— Club —</option>
                    {formTeamChoices.map((row) => (
                      <option key={row.team.id} value={row.team.id}>
                        {row.team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="admin-match-away" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Extérieur
                  </label>
                  <select
                    id="admin-match-away"
                    value={formAwayId}
                    onChange={(e) => setFormAwayId(e.target.value)}
                    required
                    disabled={!formCompetitionId.trim() || formTeamChoices.length === 0}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30 disabled:opacity-40"
                  >
                    <option value="">— Club —</option>
                    {formTeamChoices.map((row) => (
                      <option key={`a-${row.team.id}`} value={row.team.id}>
                        {row.team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!formCompetitionId.trim() || formTeamChoices.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  Sélectionnez une compétition qui a des clubs inscrits pour choisir les équipes.
                </p>
              ) : null}
              <div>
                <label htmlFor="admin-match-round" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Tour / journée
                </label>
                <input
                  id="admin-match-round"
                  type="text"
                  value={formRound}
                  onChange={(e) => setFormRound(e.target.value)}
                  placeholder="ex. Journée 3"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400/30"
                />
              </div>
              <div>
                <label htmlFor="admin-match-when" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Date et heure
                </label>
                <input
                  id="admin-match-when"
                  type="datetime-local"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30 [color-scheme:dark]"
                />
              </div>
              <div>
                <label htmlFor="admin-match-status" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Statut
                </label>
                <select
                  id="admin-match-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white focus:outline-none focus:border-amber-400/30"
                >
                  {MATCH_FORM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {formModal === 'edit' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="admin-match-hs" className="block text-xs font-medium text-slate-400 mb-1.5">
                      Score domicile
                    </label>
                    <input
                      id="admin-match-hs"
                      type="number"
                      min={0}
                      value={formHomeScore}
                      onChange={(e) => setFormHomeScore(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white tabular-nums focus:outline-none focus:border-amber-400/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-match-as" className="block text-xs font-medium text-slate-400 mb-1.5">
                      Score extérieur
                    </label>
                    <input
                      id="admin-match-as"
                      type="number"
                      min={0}
                      value={formAwayScore}
                      onChange={(e) => setFormAwayScore(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-amber-400/10 text-sm text-white tabular-nums focus:outline-none focus:border-amber-400/30"
                    />
                  </div>
                  <p className="col-span-2 text-[10px] text-slate-500">
                    Laissez les scores vides pour ne pas les modifier. Pour valider un résultat depuis SCHEDULED, renseignez les deux scores et passez le statut à PLAYED.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={formSaving}
                  onClick={() => closeFormModal()}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] text-sm font-bold hover:from-amber-300 hover:to-amber-400 disabled:opacity-40"
                >
                  {formSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setScoreModal(null)}
          />
          <div
            ref={modalRef}
            className="relative w-full max-w-md bg-[#0a0f1e] border border-amber-400/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-400/10 bg-gradient-to-r from-amber-400/[0.03] to-transparent">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-400" />
                Saisir le Résultat
              </h2>
              <button
                onClick={() => setScoreModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 hover:rotate-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitScore} className="p-6 space-y-6">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Match info */}
              {scoreModal.competition && (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-slate-500 font-medium">
                    <Trophy className="w-3 h-3 text-amber-400/50" />
                    {scoreModal.competition.name}
                    {scoreModal.round && <span className="text-slate-600">· {scoreModal.round}</span>}
                  </span>
                </div>
              )}

              {/* Score inputs */}
              <div className="flex items-center gap-4">
                {/* Home */}
                <div className="flex-1 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-400 uppercase">
                    {scoreModal.homeTeam.logo_url ? (
                      <img src={scoreModal.homeTeam.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      scoreModal.homeTeam.name.slice(0, 2)
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{scoreModal.homeTeam.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full text-center text-3xl font-black py-4 rounded-xl bg-white/[0.04] border border-amber-400/10 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 tabular-nums"
                  />
                </div>

                <span className="text-lg font-bold text-slate-600 mt-8">–</span>

                {/* Away */}
                <div className="flex-1 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-400 uppercase">
                    {scoreModal.awayTeam.logo_url ? (
                      <img src={scoreModal.awayTeam.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      scoreModal.awayTeam.name.slice(0, 2)
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{scoreModal.awayTeam.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full text-center text-3xl font-black py-4 rounded-xl bg-white/[0.04] border border-amber-400/10 text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 tabular-nums"
                  />
                </div>
              </div>

              {/* Events section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Buteurs & Passeurs
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAddEventSide(addEventSide === 'home' ? null : 'home')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        addEventSide === 'home'
                          ? 'bg-amber-400/15 text-amber-400 border border-amber-400/25'
                          : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300 hover:border-white/10'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      {scoreModal.homeTeam.name.slice(0, 10)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddEventSide(addEventSide === 'away' ? null : 'away')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        addEventSide === 'away'
                          ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/25'
                          : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:text-slate-300 hover:border-white/10'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      {scoreModal.awayTeam.name.slice(0, 10)}
                    </button>
                  </div>
                </div>

                {/* Player picker dropdown */}
                {addEventSide && (
                  <div className="rounded-xl border border-amber-400/10 bg-[#080c18] overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                    <div className="px-3 py-2 border-b border-white/[0.04] text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Sélectionner un joueur — {addEventSide === 'home' ? scoreModal.homeTeam.name : scoreModal.awayTeam.name}
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-white/[0.03]">
                      {(addEventSide === 'home' ? homeMembers : awayMembers).length === 0 ? (
                        <div className="px-3 py-4 text-xs text-slate-600 text-center">
                          Aucun joueur trouvé
                        </div>
                      ) : (
                        (addEventSide === 'home' ? homeMembers : awayMembers).map((member) => (
                          <div key={member.user_id} className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
                                {(member.ea_persona_name ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-slate-300 font-medium truncate">
                                {member.ea_persona_name ?? 'Joueur'}
                              </span>
                            </div>
                            <div className="flex gap-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => addEvent(member, addEventSide, 'GOAL')}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-all"
                              >
                                <Goal className="w-3 h-3" />
                                But
                              </button>
                              <button
                                type="button"
                                onClick={() => addEvent(member, addEventSide, 'ASSIST')}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold hover:bg-blue-500/20 transition-all"
                              >
                                <Swords className="w-3 h-3" />
                                Passe
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Event list */}
                {events.length > 0 && (
                  <div className="space-y-1.5">
                    {events.map((ev, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] animate-[fadeIn_0.15s_ease-out]"
                      >
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${
                          ev.type === 'GOAL'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        }`}>
                          {ev.type === 'GOAL' ? 'B' : 'P'}
                        </span>
                        <span className="text-xs text-white font-medium truncate flex-1">
                          {ev.player_name}
                        </span>
                        <span className="text-[10px] text-slate-600 truncate max-w-[80px]">
                          {ev.team_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEvent(i)}
                          className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScoreModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 active:scale-[0.97]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] text-sm font-bold hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 transition-all duration-300 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Valider le Résultat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Score Correction Modal (PLAYED matches) ── */}
      {correctModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setCorrectModal(null)}
          />
          <div className="relative w-full max-w-sm bg-[#0a0f1e] border border-orange-400/20 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-orange-400/10 bg-gradient-to-r from-orange-400/[0.04] to-transparent">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-orange-400" />
                Correction de Score
              </h2>
              <button
                onClick={() => setCorrectModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 hover:rotate-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCorrectScore} className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Context */}
              <div className="text-center space-y-1">
                {correctModal.competition && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-slate-500 font-medium">
                    <Trophy className="w-3 h-3 text-orange-400/50" />
                    {correctModal.competition.name}
                    {correctModal.round && <span className="text-slate-600">· {correctModal.round}</span>}
                  </span>
                )}
                <p className="text-[11px] text-orange-400/60 font-medium">
                  Score actuel : {correctModal.home_score} – {correctModal.away_score}
                </p>
              </div>

              {/* Score inputs */}
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center space-y-2">
                  <p className="text-xs font-semibold text-white truncate">{correctModal.homeTeam.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={correctHome}
                    onChange={(e) => setCorrectHome(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full text-center text-3xl font-black py-4 rounded-xl bg-white/[0.04] border border-orange-400/15 text-white placeholder:text-slate-700 focus:outline-none focus:border-orange-400/40 focus:ring-1 focus:ring-orange-400/20 transition-all duration-200 tabular-nums"
                  />
                </div>
                <span className="text-lg font-bold text-slate-600 mt-6">–</span>
                <div className="flex-1 text-center space-y-2">
                  <p className="text-xs font-semibold text-white truncate">{correctModal.awayTeam.name}</p>
                  <input
                    type="number"
                    min="0"
                    value={correctAway}
                    onChange={(e) => setCorrectAway(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full text-center text-3xl font-black py-4 rounded-xl bg-white/[0.04] border border-orange-400/15 text-white placeholder:text-slate-700 focus:outline-none focus:border-orange-400/40 focus:ring-1 focus:ring-orange-400/20 transition-all duration-200 tabular-nums"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-600 text-center">
                Le classement sera recalculé automatiquement.
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCorrectModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 active:scale-[0.97]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={correcting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-[#020617] text-sm font-bold hover:from-orange-300 hover:to-orange-400 disabled:opacity-40 transition-all duration-300 shadow-lg shadow-orange-400/20 hover:shadow-orange-400/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {correcting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmer la Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal (DISPUTED matches) ── */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setRescheduleModal(null)}
          />
          <div className="relative w-full max-w-sm bg-[#0a0f1e] border border-cyan-400/20 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-400/10 bg-gradient-to-r from-cyan-400/[0.04] to-transparent">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-cyan-400" />
                Reprogrammer le Match
              </h2>
              <button
                onClick={() => setRescheduleModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 hover:rotate-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReschedule} className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Match context */}
              <div className="flex items-center justify-center gap-3 py-3 rounded-xl bg-white/[0.02] border border-red-500/10">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/15 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                  <ShieldAlert className="w-3 h-3" />
                  Litige
                </span>
                <span className="text-sm font-semibold text-white truncate">
                  {rescheduleModal.homeTeam.name} <span className="text-slate-600 font-normal">vs</span> {rescheduleModal.awayTeam.name}
                </span>
              </div>

              {/* Datetime picker */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nouvelle date et heure
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-cyan-400/15 text-sm text-white focus:outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-all duration-200 [color-scheme:dark]"
                />
              </div>

              <p className="text-[10px] text-slate-600 text-center">
                Le statut repassera à SCHEDULED. Les scores seront remis à zéro.
                <br />Les managers des deux clubs seront notifiés automatiquement.
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 active:scale-[0.97]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={rescheduling || !scheduledAt}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-[#020617] text-sm font-bold hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-40 transition-all duration-300 shadow-lg shadow-cyan-400/20 hover:shadow-cyan-400/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {rescheduling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ProClubs Sync Preview Modal */}
      {syncPreviewMatch && (
        <SyncPreviewModal
          match={syncPreviewMatch}
          open={!!syncPreviewMatch}
          onClose={() => setSyncPreviewMatch(null)}
          onSynced={() => handleSyncCompleted(syncPreviewMatch.id)}
        />
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
