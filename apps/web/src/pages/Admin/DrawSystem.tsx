import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy, Shuffle, MousePointerClick, CheckCircle2, AlertCircle,
  Loader2, Sparkles, ArrowLeft, Zap, RotateCcw, Crown, Medal,
} from 'lucide-react';
import api from '@/lib/api';
import { getCompTypeConfig } from '@/lib/competition-icons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Competition {
  id: string;
  name: string;
  type: 'CUP' | 'CHAMPIONS';
  status: string;
  teams: { team_id: string; team: Team }[];
}

type DrawMode = 'auto' | 'manual';
type Phase = 'mode_select' | 'drawing' | 'preview' | 'done';

// ─── Constants ───────────────────────────────────────────────────────────────


const CHAPEAUX_CONFIG = [
  { label: 'Chapeau 1', color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20'  },
  { label: 'Chapeau 2', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  { label: 'Chapeau 3', color: 'text-sky-400',    bg: 'bg-sky-400/10',    border: 'border-sky-400/20'    },
  { label: 'Chapeau 4', color: 'text-rose-400',   bg: 'bg-rose-400/10',   border: 'border-rose-400/20'   },
];

const ANIM_DURATION = 650; // ms per draw
const ANIM_GAP = 200;      // ms between sequential draws

const CUP_DRAG_TYPE = 'application/x-eagles-cup-drag';

type CupDragPayload = { teamId: string; fromSlot: number | null };

function parseCupDrag(data: string): CupDragPayload | null {
  try {
    const o = JSON.parse(data) as CupDragPayload;
    if (o && typeof o.teamId === 'string') return { teamId: o.teamId, fromSlot: o.fromSlot ?? null };
  } catch {
    /* ignore */
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TeamChip({
  team,
  dimmed = false,
  highlighted = false,
  onClick,
  seed,
  draggable = false,
  onDragStart,
}: {
  team: Team;
  dimmed?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  seed?: number;
  draggable?: boolean;
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void;
}) {
  const inactive = dimmed || (!draggable && !onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inactive}
      aria-disabled={inactive}
      draggable={draggable && !dimmed}
      onDragStart={draggable ? onDragStart : undefined}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-300 ${
        draggable && !inactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        highlighted
          ? 'border-amber-400/60 bg-amber-400/20 text-white scale-105 shadow-lg shadow-amber-400/20 z-10'
          : dimmed
            ? 'border-white/[0.04] bg-white/[0.02] text-slate-600 opacity-55 cursor-not-allowed pointer-events-none'
            : onClick
              ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-amber-400/30 hover:bg-amber-400/[0.06] hover:text-white cursor-pointer'
              : 'border-white/[0.08] bg-white/[0.04] text-slate-300'
      }`}
    >
      {seed !== undefined && (
        <span className="shrink-0 w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-black text-slate-500 tabular-nums">
          {seed}
        </span>
      )}
      <div className="w-5 h-5 rounded-md bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-[9px] font-bold text-slate-500 uppercase shrink-0">
        {team.logo_url ? (
          <img src={team.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
        ) : (
          team.name.charAt(0)
        )}
      </div>
      <span className="truncate max-w-[120px]">{team.name}</span>
    </button>
  );
}

function EmptySlot({
  label,
  active = false,
  onDragOver,
  onDrop,
  dragActive = false,
}: {
  label: string;
  active?: boolean;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
  dragActive?: boolean;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-300 ${
        dragActive
          ? 'border-amber-400/60 bg-amber-500/10 text-amber-200'
          : active
            ? 'border-amber-400/40 bg-amber-400/[0.06] text-amber-400/70 animate-pulse'
            : 'border-dashed border-white/[0.08] text-slate-700'
      }`}
    >
      <span className="w-5 h-5 rounded-md border border-dashed border-white/[0.12] shrink-0" />
      <span>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DrawSystem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<DrawMode>('manual');
  const [phase, setPhase] = useState<Phase>('mode_select');

  // ── CUP state ──────────────────────────────────────────────────────────────
  const [cupSeeds, setCupSeeds] = useState<(Team | null)[]>([]);
  const cupSeedsRef = useRef<(Team | null)[]>([]);

  // ── CHAMPIONS state ────────────────────────────────────────────────────────
  const [champPots, setChampPots] = useState<Team[][]>([[], [], [], []]);
  const [champUrn, setChampUrn] = useState<Team[]>([]);
  const [currentPot, setCurrentPot] = useState(0);
  const potSize = useRef(0);

  /** Intégrité des chapeaux (API) — UCL manuel uniquement */
  const [potsIntegrity, setPotsIntegrity] = useState<{
    loading: boolean;
    valid: boolean | null;
    errors: string[];
  }>({ loading: false, valid: null, errors: [] });

  // ── Animation state ────────────────────────────────────────────────────────
  const [animatingTeam, setAnimatingTeam] = useState<Team | null>(null);
  const isAnimating = useRef(false);
  const autoDrawRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load competition ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    api.get(`/admin/competitions`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : (res.data.data ?? []);
      const comp = list.find((c: Competition) => c.id === id);
      if (!comp) { setError('Compétition introuvable.'); return; }
      if (comp.type === 'LEAGUE') { setError('Le tirage au sort n\'est pas disponible pour les championnats.'); return; }
      setCompetition(comp);
      initState(comp);
    }).catch(() => setError('Impossible de charger la compétition.'))
      .finally(() => setLoading(false));
  }, [id]);

  function initState(comp: Competition) {
    const teams = comp.teams.map((ct) => ct.team);
    if (comp.type === 'CUP') {
      setCupSeeds(Array(teams.length).fill(null));
    } else {
      const ps = Math.ceil(teams.length / 4);
      potSize.current = ps;
      setChampPots([[], [], [], []]);
      setChampUrn(teams);
      setCurrentPot(0);
    }
  }

  function resetDraw() {
    if (autoDrawRef.current) clearTimeout(autoDrawRef.current);
    isAnimating.current = false;
    setAnimatingTeam(null);
    setPhase('mode_select');
    setError('');
    if (competition) initState(competition);
  }

  const teams = competition?.teams.map((ct) => ct.team) ?? [];
  cupSeedsRef.current = cupSeeds;

  // ── CUP: draw one team ─────────────────────────────────────────────────────

  const cupDrawOne = useCallback(() => {
    if (isAnimating.current) return;
    const prev = cupSeedsRef.current;
    const available = teams.filter((t) => !prev.some((s) => s?.id === t.id));
    if (available.length === 0) return;
    const slot = prev.findIndex((s) => s === null);
    if (slot === -1) return;
    const team = available[Math.floor(Math.random() * available.length)];

    isAnimating.current = true;
    setAnimatingTeam(team);

    setTimeout(() => {
      setCupSeeds((p) => {
        const next = [...p];
        if (next[slot] === null) next[slot] = team;
        return next;
      });
      setAnimatingTeam(null);
      isAnimating.current = false;
    }, ANIM_DURATION);
  }, [teams]);

  const cupDrawAll = useCallback(() => {
    const step = () => {
      if (isAnimating.current) {
        autoDrawRef.current = setTimeout(step, 100);
        return;
      }
      const prev = cupSeedsRef.current;
      if (prev.every((s) => s !== null)) return;
      const available = teams.filter((t) => !prev.some((s) => s?.id === t.id));
      if (available.length === 0) return;
      const slot = prev.findIndex((s) => s === null);
      if (slot === -1) return;
      const team = available[Math.floor(Math.random() * available.length)];

      isAnimating.current = true;
      setAnimatingTeam(team);

      setTimeout(() => {
        setCupSeeds((p) => {
          const next = [...p];
          if (next[slot] === null) next[slot] = team;
          return next;
        });
        setAnimatingTeam(null);
        isAnimating.current = false;
        autoDrawRef.current = setTimeout(step, ANIM_GAP);
      }, ANIM_DURATION);
    };
    step();
  }, [teams]);

  const handleCupDropOnSlot = useCallback(
    (slotIndex: number, e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(CUP_DRAG_TYPE);
      const payload = parseCupDrag(raw);
      if (!payload) return;
      const team = teams.find((t) => t.id === payload.teamId);
      if (!team) return;

      setCupSeeds((prev) => {
        const next = [...prev];
        for (let i = 0; i < next.length; i++) {
          if (next[i]?.id === payload.teamId) next[i] = null;
        }
        next[slotIndex] = team;
        return next;
      });
    },
    [teams],
  );

  const handleCupDragOverSlot = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ── CHAMPIONS: draw one team into current pot ──────────────────────────────

  const champDrawOne = useCallback(() => {
    if (isAnimating.current) return;

    setChampUrn((urn) => {
      if (urn.length === 0) return urn;
      const ps = potSize.current;

      isAnimating.current = true;
      const idx = Math.floor(Math.random() * urn.length);
      const team = urn[idx];
      const nextUrn = urn.filter((_, i) => i !== idx);

      setAnimatingTeam(team);

      setTimeout(() => {
        setChampPots((prev) => {
          const next = prev.map((p) => [...p]);
          next[currentPot] = [...next[currentPot], team];

          // Advance to next pot if current is full
          const filledCount = next[currentPot].length;
          if (filledCount >= ps) {
            const nextPot = currentPot + 1;
            if (nextPot < 4) setCurrentPot(nextPot);
          }

          return next;
        });
        setAnimatingTeam(null);
        isAnimating.current = false;
      }, ANIM_DURATION);

      return nextUrn;
    });
  }, [currentPot]);

  const champDrawAll = useCallback(() => {
    const step = () => {
      if (isAnimating.current) { autoDrawRef.current = setTimeout(step, 100); return; }
      setChampUrn((urn) => {
        if (urn.length === 0) return urn;
        const ps = potSize.current;
        const idx = Math.floor(Math.random() * urn.length);
        const team = urn[idx];
        const nextUrn = urn.filter((_, i) => i !== idx);

        isAnimating.current = true;
        setAnimatingTeam(team);

        setTimeout(() => {
          setChampPots((prev) => {
            const next = prev.map((p) => [...p]);
            let pot = 0;
            for (let i = 0; i < next.length; i++) {
              if (next[i].length < ps) { pot = i; break; }
            }
            next[pot] = [...next[pot], team];
            const nextPotIdx = next.findIndex((p) => p.length < ps);
            if (nextPotIdx !== -1) setCurrentPot(nextPotIdx);
            return next;
          });
          setAnimatingTeam(null);
          isAnimating.current = false;
          if (nextUrn.length > 0) autoDrawRef.current = setTimeout(step, ANIM_GAP);
        }, ANIM_DURATION);

        return nextUrn;
      });
    };
    step();
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const cupPlacedTeams = cupSeeds.filter((s): s is Team => s !== null);
  const cupUniqueIds = new Set(cupPlacedTeams.map((t) => t.id));
  /** Tirage mathématiquement valide : N places remplies + N IDs distincts */
  const cupSeedsStrictlyValid =
    cupPlacedTeams.length === teams.length &&
    new Set(cupPlacedTeams.map((t) => t.id)).size === teams.length;
  const hasCupDuplicatePlacements =
    cupPlacedTeams.length > 0 && cupUniqueIds.size !== cupPlacedTeams.length;

  const cupAvailablePool = useMemo(() => {
    const reserved = new Set<string>();
    cupSeeds.forEach((s) => {
      if (s) reserved.add(s.id);
    });
    if (animatingTeam) reserved.add(animatingTeam.id);
    return teams.filter((t) => !reserved.has(t.id));
  }, [teams, cupSeeds, animatingTeam]);
  const champComplete =
    champUrn.length === 0 &&
    champPots.every((p) => p.length === potSize.current && potSize.current > 0);

  const champPotsKey =
    competition?.type === 'CHAMPIONS'
      ? JSON.stringify(champPots.map((p) => p.map((t) => t.id)))
      : '';

  // ── Validation chapeaux UCL (serveur) ───────────────────────────────────────

  useEffect(() => {
    if (competition?.type !== 'CHAMPIONS' || phase !== 'drawing' || !id) {
      setPotsIntegrity({ loading: false, valid: null, errors: [] });
      return;
    }
    if (!champComplete) {
      setPotsIntegrity({ loading: false, valid: null, errors: [] });
      return;
    }

    const pots = champPots.map((p) => p.map((t) => t.id));
    setPotsIntegrity((prev) => ({ ...prev, loading: true }));

    const t = setTimeout(() => {
      api
        .post<{ valid: boolean; errors: string[] }>(
          `/admin/competitions/${id}/draw/validate-pots`,
          { pots },
        )
        .then((res) => {
          const data = res.data;
          setPotsIntegrity({
            loading: false,
            valid: data.valid,
            errors: Array.isArray(data.errors) ? data.errors : [],
          });
        })
        .catch(() => {
          setPotsIntegrity({
            loading: false,
            valid: false,
            errors: ['Impossible de vérifier les chapeaux.'],
          });
        });
    }, 280);

    return () => clearTimeout(t);
  }, [competition?.type, phase, id, champComplete, champPotsKey]);

  // CUP pairs preview
  const cupPairs: { home: Team; away: Team }[] = [];
  if (cupSeedsStrictlyValid) {
    const filled = cupSeeds as Team[];
    const half = Math.floor(filled.length / 2);
    for (let i = 0; i < half; i++) {
      const home = filled[i];
      const away = filled[filled.length - 1 - i];
      if (home && away) cupPairs.push({ home, away });
    }
  }

  // CUP current slot index
  const cupCurrentSlot = cupSeeds.findIndex((s) => s === null);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/admin/competitions/${id}/draw`, { mode: 'auto' });
      setSuccess(res.data.message ?? 'Tirage effectué avec succès !');
      setPhase('done');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors du tirage automatique.');
    } finally {
      setSubmitting(false);
    }
  };

  const CUP_FINALIZE_HINT =
    'Attention : Toutes les équipes doivent être placées une seule fois avant de finaliser.';

  const handleManualSubmit = async () => {
    setError('');
    if (competition?.type === 'CUP' && !cupSeedsStrictlyValid) {
      setError(CUP_FINALIZE_HINT);
      return;
    }

    setSubmitting(true);
    try {
      const body = competition?.type === 'CUP'
        ? { mode: 'manual', seeds: (cupSeeds as Team[]).map((t) => t.id) }
        : { mode: 'manual', pots: champPots.map((p) => p.map((t) => t.id)) };

      const res = await api.post(`/admin/competitions/${id}/draw`, body);
      setSuccess(res.data.message ?? 'Tirage validé !');
      setPhase('done');
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const msg =
        typeof raw === 'string' ? raw : 'Erreur lors de la validation du tirage.';
      if (
        competition?.type === 'CUP' &&
        (msg.includes('seeds') || msg.includes('équipes inscrites') || msg.includes('exactement'))
      ) {
        setError(CUP_FINALIZE_HINT);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/admin/competitions')} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </button>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error || 'Compétition introuvable.'}
        </div>
      </div>
    );
  }

  const typeCfg = getCompTypeConfig(competition.type);
  const TypeIcon = typeCfg.Icon;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate('/admin/competitions')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Retour aux compétitions
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${typeCfg.bg} ${typeCfg.border}`}>
            <TypeIcon className={`w-5 h-5 ${typeCfg.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{competition.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tirage au sort · {teams.length} équipes · {typeCfg.label}
            </p>
          </div>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Done ───────────────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div className="flex flex-col items-center gap-5 py-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">Tirage terminé !</p>
            <p className="text-sm text-slate-400 mt-1">{success}</p>
          </div>
          <button
            onClick={() => navigate('/admin/competitions')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-[#020617] text-sm font-bold hover:from-emerald-300 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-400/20"
          >
            Voir les compétitions
          </button>
        </div>
      )}

      {/* ── Mode selector ──────────────────────────────────────────────── */}
      {phase === 'mode_select' && (
        <div className="space-y-6">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
            {(['manual', 'auto'] as DrawMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                {m === 'manual' ? <MousePointerClick className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {m === 'manual' ? 'Tirage Manuel' : 'Tirage Automatique'}
              </button>
            ))}
          </div>

          {/* AUTO mode */}
          {mode === 'auto' && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 flex flex-col items-center gap-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Shuffle className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Tirage automatique aléatoire</p>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">
                  {competition.type === 'CUP'
                    ? 'Les équipes seront tirées aléatoirement. Les meilleures têtes de série ne se rencontrent pas avant la finale.'
                    : 'Les équipes seront réparties en 4 chapeaux équilibrés. Une équipe par chapeau par groupe (contrainte UCL).'}
                </p>
              </div>
              <button
                onClick={handleAutoSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] text-sm font-bold hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 transition-all duration-300 shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Lancer le Tirage Automatique
              </button>
            </div>
          )}

          {/* MANUAL mode description */}
          {mode === 'manual' && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
              <p className="text-sm text-slate-400">
                {competition.type === 'CUP'
                  ? `Remplissez les ${teams.length} positions une à une. Le bracket sera construit automatiquement : Position 1 affronte Position ${teams.length}, Position 2 affronte Position ${teams.length - 1}, etc.`
                  : `Remplissez les ${Math.ceil(teams.length / 4)} équipes par chapeau une à une. Le backend distribuera ensuite une équipe de chaque chapeau par groupe.`}
              </p>
              <button
                onClick={() => setPhase('drawing')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#020617] text-sm font-bold hover:from-amber-300 hover:to-amber-400 transition-all duration-300 shadow-lg shadow-amber-400/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <MousePointerClick className="w-4 h-4" />
                Commencer le Tirage Manuel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CUP Manual Draw ────────────────────────────────────────────── */}
      {phase === 'drawing' && competition.type === 'CUP' && (
        <CupDraw
          teams={teams}
          cupSeeds={cupSeeds}
          cupAvailablePool={cupAvailablePool}
          cupSeedsStrictlyValid={cupSeedsStrictlyValid}
          hasCupDuplicatePlacements={hasCupDuplicatePlacements}
          cupPairs={cupPairs}
          cupCurrentSlot={cupCurrentSlot}
          animatingTeam={animatingTeam}
          submitting={submitting}
          totalTeams={teams.length}
          onDrawOne={cupDrawOne}
          onDrawAll={cupDrawAll}
          onDropOnSlot={handleCupDropOnSlot}
          onDragOverSlot={handleCupDragOverSlot}
          onReset={resetDraw}
          onConfirm={handleManualSubmit}
        />
      )}

      {/* ── CHAMPIONS Manual Draw ───────────────────────────────────────── */}
      {phase === 'drawing' && competition.type === 'CHAMPIONS' && (
        <ChampionsDraw
          teams={teams}
          champPots={champPots}
          champUrn={champUrn}
          champComplete={champComplete}
          potSize={potSize.current}
          animatingTeam={animatingTeam}
          submitting={submitting}
          potsIntegrity={potsIntegrity}
          onDrawOne={champDrawOne}
          onDrawAll={champDrawAll}
          onReset={resetDraw}
          onConfirm={handleManualSubmit}
        />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes drawPop {
          0%   { transform: scale(0.7) translateY(10px); opacity: 0; }
          60%  { transform: scale(1.12) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-draw-pop { animation: drawPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>
    </div>
  );
}

// ─── CUP Draw Panel ───────────────────────────────────────────────────────────

function CupDraw({
  teams,
  cupSeeds,
  cupAvailablePool,
  cupSeedsStrictlyValid,
  hasCupDuplicatePlacements,
  cupPairs,
  cupCurrentSlot,
  animatingTeam,
  submitting,
  totalTeams,
  onDrawOne,
  onDrawAll,
  onDropOnSlot,
  onDragOverSlot,
  onReset,
  onConfirm,
}: {
  teams: Team[];
  cupSeeds: (Team | null)[];
  cupAvailablePool: Team[];
  cupSeedsStrictlyValid: boolean;
  hasCupDuplicatePlacements: boolean;
  cupPairs: { home: Team; away: Team }[];
  cupCurrentSlot: number;
  animatingTeam: Team | null;
  submitting: boolean;
  totalTeams: number;
  onDrawOne: () => void;
  onDrawAll: () => void;
  onDropOnSlot: (slotIndex: number, e: DragEvent<HTMLDivElement>) => void;
  onDragOverSlot: (e: DragEvent<HTMLDivElement>) => void;
  onReset: () => void;
  onConfirm: () => void;
}) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const remaining = cupAvailablePool.length;
  const placedCount = cupSeeds.filter((s): s is Team => s !== null).length;
  const canFinalizeCup = cupSeedsStrictlyValid && !submitting;

  const startDrag =
    (team: Team, fromSlot: number | null) => (e: DragEvent<HTMLButtonElement>) => {
      const payload: CupDragPayload = { teamId: team.id, fromSlot };
      e.dataTransfer.setData(CUP_DRAG_TYPE, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'move';
    };

  return (
    <div className="space-y-6">
      {/* ── Animated drawn team ── */}
      <div className="h-16 flex items-center justify-center">
        {animatingTeam ? (
          <div className="animate-draw-pop flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/20 to-amber-600/10 shadow-xl shadow-amber-400/20">
            <div className="w-8 h-8 rounded-lg bg-white/[0.1] border border-white/10 flex items-center justify-center text-sm font-bold text-amber-300">
              {animatingTeam.name.charAt(0)}
            </div>
            <span className="text-base font-black text-white">{animatingTeam.name}</span>
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
        ) : (
          <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">
            {cupSeedsStrictlyValid
              ? '✓ Tirage valide — prêt à finaliser'
              : remaining > 0
                ? `${remaining} équipe${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}`
                : placedCount >= totalTeams
                  ? 'Corrigez les doublons (glisser-déposer) pour valider'
                  : ''}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Left: Bracket slots ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Positions du bracket ({cupSeeds.filter(Boolean).length}/{teams.length})
          </h3>
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {cupSeeds.map((team, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-600 w-6 text-right shrink-0">#{i + 1}</span>
                {team ? (
                  <div
                    className="min-w-0 flex-1 rounded-xl"
                    onDragOver={(e) => {
                      onDragOverSlot(e);
                      setDragOverSlot(i);
                    }}
                    onDragLeave={() => setDragOverSlot((s) => (s === i ? null : s))}
                    onDrop={(e) => {
                      setDragOverSlot(null);
                      onDropOnSlot(i, e);
                    }}
                  >
                    <TeamChip
                      team={team}
                      seed={i + 1}
                      draggable
                      onDragStart={startDrag(team, i)}
                    />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <EmptySlot
                      label={`Tête de série ${i + 1}`}
                      active={i === cupCurrentSlot}
                      dragActive={dragOverSlot === i}
                      onDragOver={(e) => {
                        onDragOverSlot(e);
                        setDragOverSlot(i);
                      }}
                      onDrop={(e) => {
                        setDragOverSlot(null);
                        onDropOnSlot(i, e);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Urn ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Shuffle className="w-3.5 h-3.5 text-slate-400" />
            Urne · {remaining} disponible{remaining > 1 ? 's' : ''} / {totalTeams}
          </h3>
          <p className="text-[10px] text-slate-600 leading-snug">
            Glissez une équipe vers une position, ou utilisez le tirage aléatoire. Les équipes placées
            n’apparaissent plus ici.
          </p>
          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] min-h-[120px] content-start">
            {cupAvailablePool.length === 0 ? (
              <p className="text-xs text-slate-700 m-auto text-center px-2">
                {placedCount >= totalTeams && hasCupDuplicatePlacements
                  ? 'Ajustez les positions par glisser-déposer : une équipe est en double.'
                  : 'Aucune équipe disponible dans l’urne'}
              </p>
            ) : (
              cupAvailablePool.map((team) => (
                <TeamChip
                  key={team.id}
                  team={team}
                  highlighted={animatingTeam?.id === team.id}
                  draggable
                  onDragStart={startDrag(team, null)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Preview pairs ── */}
      {cupSeedsStrictlyValid && cupPairs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Medal className="w-3.5 h-3.5 text-orange-400" />
            Aperçu du bracket
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {cupPairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex-1 text-right">
                  <span className="text-xs font-semibold text-white truncate">{pair.home.name}</span>
                  <span className="ml-1 text-[10px] text-slate-600">(S{i + 1})</span>
                </div>
                <span className="text-xs font-black text-slate-600 shrink-0">VS</span>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-white truncate">{pair.away.name}</span>
                  <span className="ml-1 text-[10px] text-slate-600">(S{cupSeeds.length - i})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-500 text-sm font-medium hover:text-slate-300 hover:border-white/20 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Recommencer
        </button>

        {remaining > 0 && (
          <>
            <button
              type="button"
              onClick={onDrawOne}
              disabled={remaining === 0 || !!animatingTeam}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-400 text-sm font-bold hover:bg-amber-400/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <MousePointerClick className="w-4 h-4" />
              Tirer une équipe
            </button>
            <button
              type="button"
              onClick={onDrawAll}
              disabled={remaining === 0 || !!animatingTeam}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-medium hover:text-white hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tout tirer
            </button>
          </>
        )}

        <div className="ml-auto flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span
              className={`text-xs font-semibold tabular-nums ${
                cupSeedsStrictlyValid ? 'text-emerald-400/90' : 'text-slate-500'
              }`}
            >
              {placedCount} / {totalTeams} équipe{placedCount !== 1 ? 's' : ''} placée
              {placedCount !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canFinalizeCup}
              title={
                !canFinalizeCup
                  ? 'Placez chaque équipe une seule fois dans le bracket pour finaliser.'
                  : undefined
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-[#020617] text-sm font-bold hover:from-emerald-300 hover:to-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-all duration-300 shadow-lg shadow-emerald-400/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finaliser le tirage
            </button>
          </div>
          {hasCupDuplicatePlacements && (
            <p className="text-[10px] text-amber-400/90 text-right max-w-[280px] leading-snug">
              Veuillez placer chaque équipe une seule fois.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CHAMPIONS Draw Panel ─────────────────────────────────────────────────────

function ChampionsDraw({
  teams, champPots, champUrn, champComplete, potSize,
  animatingTeam, submitting, potsIntegrity,
  onDrawOne, onDrawAll, onReset, onConfirm,
}: {
  teams: Team[];
  champPots: Team[][];
  champUrn: Team[];
  champComplete: boolean;
  potSize: number;
  animatingTeam: Team | null;
  submitting: boolean;
  potsIntegrity: { loading: boolean; valid: boolean | null; errors: string[] };
  onDrawOne: () => void;
  onDrawAll: () => void;
  onReset: () => void;
  onConfirm: () => void;
}) {
  const remaining = champUrn.length;
  const activePot = champPots.findIndex((p) => p.length < potSize);
  const displayPot = activePot === -1 ? 3 : activePot;

  const canConfirmDraw =
    champComplete &&
    !potsIntegrity.loading &&
    potsIntegrity.valid === true &&
    !submitting;

  return (
    <div className="space-y-6">
      {/* ── Intégrité des chapeaux (inscriptions) ── */}
      <div className="flex flex-wrap items-center gap-2">
        {potsIntegrity.loading ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-amber-500/25 bg-amber-500/10 text-amber-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Vérification des chapeaux…
          </span>
        ) : !champComplete ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-slate-600/40 bg-slate-500/10 text-slate-400">
            Répartition incomplète
          </span>
        ) : potsIntegrity.valid === true ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-emerald-500/35 bg-emerald-500/10 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Chapeaux conformes aux inscriptions
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-red-500/35 bg-red-500/10 text-red-300 max-w-full">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="break-words text-left">
              {potsIntegrity.errors[0] ?? 'Chapeaux invalides.'}
            </span>
          </span>
        )}
      </div>

      {/* ── Animated drawn team ── */}
      <div className="h-16 flex items-center justify-center">
        {animatingTeam ? (
          <div className="animate-draw-pop flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/20 to-amber-600/10 shadow-xl shadow-amber-400/20">
            <div className="w-8 h-8 rounded-lg bg-white/[0.1] border border-white/10 flex items-center justify-center text-sm font-bold text-amber-300">
              {animatingTeam.name.charAt(0)}
            </div>
            <span className="text-base font-black text-white">{animatingTeam.name}</span>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${CHAPEAUX_CONFIG[displayPot]?.bg ?? ''} ${CHAPEAUX_CONFIG[displayPot]?.color ?? ''} ${CHAPEAUX_CONFIG[displayPot]?.border ?? ''}`}>
              {CHAPEAUX_CONFIG[displayPot]?.label}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">
            {champComplete ? '✓ Chapeaux complets — prêt à valider' : remaining > 0 ? `${remaining} équipe${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} — Remplissage ${CHAPEAUX_CONFIG[displayPot]?.label}` : ''}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Left: Pots ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Chapeaux ({teams.length - remaining}/{teams.length} assignées)
          </h3>
          <div className="space-y-3">
            {CHAPEAUX_CONFIG.map((cfg, pi) => {
              const pot = champPots[pi];
              const isCurrent = pi === displayPot && !champComplete;
              const isFull = pot.length >= potSize;
              return (
                <div key={pi} className={`rounded-xl border p-3 transition-all duration-300 ${
                  isCurrent ? `${cfg.border} ${cfg.bg}` : 'border-white/[0.06] bg-white/[0.01]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? cfg.color : 'text-slate-600'}`}>
                      {cfg.label}
                      {pi === 0 && <span className="ml-1 text-slate-600 font-normal">(Têtes de groupe)</span>}
                    </span>
                    <span className={`text-[10px] tabular-nums ${pot.length >= potSize ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {pot.length}/{potSize}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                    {pot.map((team) => (
                      <span key={team.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                        isFull ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-white/[0.04] text-slate-300 border-white/[0.06]'
                      }`}>
                        {team.name}
                      </span>
                    ))}
                    {pot.length === 0 && (
                      <span className="text-[10px] text-slate-700">Vide</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Urn ── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Shuffle className="w-3.5 h-3.5 text-slate-400" />
            Urne ({champUrn.length} équipes)
          </h3>
          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] min-h-[200px] content-start">
            {champUrn.length === 0 ? (
              <p className="text-xs text-slate-700 m-auto">L'urne est vide</p>
            ) : (
              champUrn.map((team) => (
                <TeamChip
                  key={team.id}
                  team={team}
                  highlighted={animatingTeam?.id === team.id}
                />
              ))
            )}
          </div>

          {/* UCL constraint note */}
          <div className="px-3 py-2.5 rounded-xl bg-blue-400/[0.04] border border-blue-400/15 text-[11px] text-blue-400/70 leading-relaxed">
            <span className="font-bold text-blue-400">Règle UCL :</span> Le backend garantit qu'aucun groupe ne reçoit deux équipes du même chapeau — tirez librement.
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-500 text-sm font-medium hover:text-slate-300 hover:border-white/20 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Recommencer
        </button>

        {!champComplete && (
          <>
            <button
              onClick={onDrawOne}
              disabled={champUrn.length === 0 || !!animatingTeam}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-400 text-sm font-bold hover:bg-amber-400/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <MousePointerClick className="w-4 h-4" />
              Tirer une équipe
            </button>
            <button
              onClick={onDrawAll}
              disabled={champUrn.length === 0 || !!animatingTeam}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-medium hover:text-white hover:border-white/20 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tout tirer
            </button>
          </>
        )}

        {champComplete && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirmDraw}
            title={
              !canConfirmDraw && champComplete
                ? potsIntegrity.errors[0] ?? 'Validation des chapeaux en cours ou échouée.'
                : undefined
            }
            className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 text-[#020617] text-sm font-bold hover:from-blue-300 hover:to-blue-400 disabled:opacity-40 disabled:pointer-events-none transition-all duration-300 shadow-lg shadow-blue-400/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Valider le Tirage
          </button>
        )}
      </div>
    </div>
  );
}
