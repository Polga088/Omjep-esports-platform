import { useState, useEffect, useRef } from 'react';
import {
  X, Loader2, Globe, CheckCircle2, AlertTriangle,
  Goal, Swords, Link2, Search, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ScrapedMatchResult {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  players: { playerName: string; goals: number; assists: number }[];
}

interface PersonaMatch {
  scraped: string;
  goals: number;
  assists: number;
  matched: { userId: string; teamId: string; eaPersonaName: string } | null;
}

interface ScrapeResponse {
  synced: boolean;
  reason?: string;
  scraped?: ScrapedMatchResult;
  matchedPlayers?: PersonaMatch[];
}

interface MatchTarget {
  id: string;
  homeTeam: { id: string; name: string; logo_url?: string | null };
  awayTeam: { id: string; name: string; logo_url?: string | null };
  competition?: { name: string } | null;
  round?: string | null;
}

interface Props {
  match: MatchTarget;
  open: boolean;
  onClose: () => void;
  onSynced: () => void;
}

type Step = 'url' | 'loading' | 'preview' | 'confirming';

export default function SyncPreviewModal({ match, open, onClose, onSynced }: Props) {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('url');
  const [preview, setPreview] = useState<ScrapeResponse | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl('');
      setStep('url');
      setPreview(null);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && step !== 'loading' && step !== 'confirming') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, step]);

  if (!open) return null;

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setStep('loading');

    try {
      const { data } = await api.post<ScrapeResponse>('/admin/sync/url/scrape', { url: url.trim() });
      setPreview(data);
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors du scraping de la page.');
      setStep('url');
    }
  };

  const handleConfirm = async () => {
    if (!preview?.scraped) return;
    setStep('confirming');
    setError('');

    try {
      const events: { player_id: string; team_id: string; type: 'GOAL' | 'ASSIST' }[] = [];

      for (const pm of preview.matchedPlayers ?? []) {
        if (!pm.matched) continue;
        for (let i = 0; i < pm.goals; i++) {
          events.push({ player_id: pm.matched.userId, team_id: pm.matched.teamId, type: 'GOAL' });
        }
        for (let i = 0; i < pm.assists; i++) {
          events.push({ player_id: pm.matched.userId, team_id: pm.matched.teamId, type: 'ASSIST' });
        }
      }

      await api.patch(`/admin/matches/${match.id}/score`, {
        home_score: preview.scraped.homeScore,
        away_score: preview.scraped.awayScore,
        events,
      });

      toast.success('Match importé via ProClubs.io !');
      onSynced();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erreur lors de l'enregistrement.");
      setStep('preview');
    }
  };

  const matched = preview?.matchedPlayers?.filter((p) => p.matched) ?? [];
  const unmatched = preview?.matchedPlayers?.filter((p) => !p.matched) ?? [];

  const canClose = step !== 'loading' && step !== 'confirming';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />

      <div className="relative w-full max-w-lg bg-[#0a0f1e] border border-amber-400/15 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-400/10 bg-gradient-to-r from-emerald-400/[0.04] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 flex items-center justify-center border border-emerald-400/20">
              <Globe className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Importer via ProClubs.io</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {match.homeTeam.name} vs {match.awayTeam.name}
                {match.competition && <span className="text-slate-600"> · {match.competition.name}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={!canClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 hover:rotate-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ── Error banner ── */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-[fadeIn_0.2s_ease-out]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ── Step 1 : URL input ── */}
          {(step === 'url' || step === 'loading') && (
            <form onSubmit={handleScrape} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  URL de la page ProClubs.io
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    ref={inputRef}
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://proclubs.io/club/..."
                    disabled={step === 'loading'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={step === 'loading' || !url.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scraping en cours…
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Scanner la page
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Step 2 : Preview ── */}
          {(step === 'preview' || step === 'confirming') && preview?.scraped && (
            <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
              {/* Score */}
              <div className="text-center space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Score détecté
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-right flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {preview.scraped.homeTeamName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-400/20 shrink-0">
                    <span className="text-2xl font-black text-emerald-400 tabular-nums">
                      {preview.scraped.homeScore}
                    </span>
                    <span className="text-sm text-slate-500 font-bold">–</span>
                    <span className="text-2xl font-black text-emerald-400 tabular-nums">
                      {preview.scraped.awayScore}
                    </span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {preview.scraped.awayTeamName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Matched players */}
              {matched.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Joueurs matchés ({matched.length})
                  </h3>
                  <div className="space-y-1">
                    {matched.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10"
                      >
                        <span className="text-xs text-slate-400 font-mono truncate min-w-0 flex-1">
                          {p.scraped}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-400 font-semibold truncate min-w-0 flex-1 text-right">
                          {p.matched!.eaPersonaName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {p.goals > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                              <Goal className="w-2.5 h-2.5" />
                              {p.goals}
                            </span>
                          )}
                          {p.assists > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 text-[10px] font-bold">
                              <Swords className="w-2.5 h-2.5" />
                              {p.assists}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched players */}
              {unmatched.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Joueurs non matchés ({unmatched.length})
                  </h3>
                  <div className="space-y-1">
                    {unmatched.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/10"
                      >
                        <span className="text-xs text-slate-400 font-mono truncate min-w-0 flex-1">
                          {p.scraped}
                        </span>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                        <span className="text-[11px] text-amber-400/60 italic shrink-0">
                          Inconnu sur OMJEP
                        </span>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {p.goals > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/50 text-[10px] font-bold">
                              <Goal className="w-2.5 h-2.5" />
                              {p.goals}
                            </span>
                          )}
                          {p.assists > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/50 text-[10px] font-bold">
                              <Swords className="w-2.5 h-2.5" />
                              {p.assists}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(preview.matchedPlayers ?? []).length === 0 && preview.scraped.players.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-500">
                  Aucun joueur détecté sur cette page.
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => { setStep('url'); setPreview(null); setError(''); }}
                  disabled={step === 'confirming'}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 active:scale-[0.97] disabled:opacity-30"
                >
                  Modifier l'URL
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={step === 'confirming'}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {step === 'confirming' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {step === 'confirming' ? 'Enregistrement…' : 'Confirmer & Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
