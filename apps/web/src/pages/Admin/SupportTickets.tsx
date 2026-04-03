import { useCallback, useEffect, useMemo, useState } from 'react';
import { Headphones, Loader2, Lock, MessageSquarePlus, RotateCcw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

type TicketCategory = 'BUG' | 'LITIGE' | 'COMPTE';
type TicketStatus = 'OPEN' | 'CLOSED' | 'URGENT';

interface TicketAuthor {
  id: string;
  email: string;
  ea_persona_name: string | null;
  role?: string;
}

interface TicketReply {
  id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
  author: TicketAuthor;
}

interface Ticket {
  id: string;
  user_id: string;
  category: TicketCategory;
  status: TicketStatus;
  subject: string;
  message: string;
  created_at: string;
  user: TicketAuthor;
  replies: TicketReply[];
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const base =
    'inline-block rounded-sm border-[0.5px] bg-[#0a0a0c] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide';
  if (status === 'OPEN') {
    return (
      <span className={`${base} border-cyan-500/55 text-cyan-200/95`} title="Ouvert">
        OUVERT
      </span>
    );
  }
  if (status === 'URGENT') {
    return (
      <span className={`${base} border-amber-500/60 text-amber-200/95`} title="Urgent">
        URGENT
      </span>
    );
  }
  return (
    <span className={`${base} border-white/15 text-slate-500`} title="Clos">
      CLÔTURÉ
    </span>
  );
}

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Ticket[]>('/tickets');
      const list = Array.isArray(data) ? data : [];
      setTickets(list);
      setSelectedId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      toast.error('Impossible de charger les tickets.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const mergeTicket = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const sendReply = async () => {
    if (!selected) return;
    const body = replyBody.trim();
    if (body.length < 1) {
      toast.error('Message vide.');
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post<Ticket>(`/tickets/${selected.id}/replies`, { body });
      mergeTicket(data);
      setReplyBody('');
      toast.success('Réponse envoyée.');
    } catch (e: unknown) {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(raw) ? raw.join(', ') : raw;
      toast.error(typeof text === 'string' ? text : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status: TicketStatus) => {
    if (!selected) return;
    setStatusBusy(true);
    try {
      const { data } = await api.patch<Ticket>(`/tickets/${selected.id}`, { status });
      mergeTicket(data);
      toast.success(
        status === 'CLOSED' ? 'Ticket clos.' : status === 'URGENT' ? 'Marqué urgent.' : 'Statut mis à jour.',
      );
    } catch (e: unknown) {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(raw) ? raw.join(', ') : raw;
      toast.error(typeof text === 'string' ? text : 'Mise à jour impossible.');
    } finally {
      setStatusBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10">
            <Headphones className="h-5 w-5 text-amber-400" />
          </span>
          Support — Tickets
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Fil type Mercato : sélectionnez un ticket, répondez ou changez le statut.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0">
          <h2 className="mb-3 flex items-center gap-2 font-scifi text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
            File d’attente
          </h2>
          {tickets.length === 0 ? (
            <div className="rounded-[12px] border-[0.5px] border-white/10 bg-[#08090c] p-8 text-center text-sm text-slate-500">
              Aucun ticket pour le moment.
            </div>
          ) : (
            <div className="relative max-h-[70vh] overflow-y-auto pr-1">
              <div className="absolute bottom-3 left-[11px] top-3 w-px bg-white/10" aria-hidden />
              <ul className="relative space-y-0">
                {tickets.map((t) => {
                  const d = new Date(t.created_at);
                  const datePart = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                  const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const active = t.id === selectedId;
                  return (
                    <li key={t.id} className="relative pb-8 pl-9 last:pb-2">
                      <span
                        className={`absolute left-[11px] top-[0.65rem] z-[1] h-2 w-2 -translate-x-1/2 rounded-full border border-white/20 bg-[#08090c] ${
                          active ? 'ring-2 ring-amber-400/40' : ''
                        }`}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={`min-w-0 w-full rounded-md py-2 pl-3 pr-2 text-left transition-colors ${
                          active
                            ? 'border-l-2 border-amber-400 bg-white/[0.04]'
                            : 'border-l-2 border-transparent hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <TicketStatusBadge status={t.status} />
                            <span className="inline-block rounded-sm border-[0.5px] border-white/12 bg-[#0a0a0c] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                              {t.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-white/40">
                            <span>{datePart}</span>
                            <span className="mx-1 text-white/25">·</span>
                            <span className="font-mono tabular-nums text-white/55">{timePart}</span>
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-white">{t.subject}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {t.user.ea_persona_name ?? t.user.email}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-white/[0.06] bg-[#08090c] p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {!selected ? (
            <p className="py-12 text-center text-sm text-slate-500">Sélectionnez un ticket.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TicketStatusBadge status={selected.status} />
                    <span className="rounded-sm border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-slate-500">
                      {selected.category}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-white">{selected.subject}</h3>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {selected.user.email}
                    {selected.user.ea_persona_name ? ` · ${selected.user.ea_persona_name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.status !== 'CLOSED' ? (
                    <>
                      {selected.status !== 'URGENT' ? (
                        <button
                          type="button"
                          disabled={statusBusy}
                          onClick={() => void setStatus('URGENT')}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Urgent
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={statusBusy}
                        onClick={() => void setStatus('CLOSED')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-500/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:bg-white/5 disabled:opacity-40"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Clore
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={statusBusy}
                      onClick={() => void setStatus('OPEN')}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Rouvrir
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Message initial</p>
                  <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
                    {selected.message}
                  </p>
                </div>
                {selected.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-lg border p-3 ${
                      r.is_staff
                        ? 'border-amber-500/20 bg-amber-950/15'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {r.author.ea_persona_name ?? r.author.email}
                      {r.is_staff ? ' · staff' : ''}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-300">{r.body}</p>
                    <p className="mt-2 font-mono text-[10px] text-slate-600">
                      {new Date(r.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>

              {selected.status !== 'CLOSED' ? (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Réponse staff
                  </label>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={4}
                    placeholder="Votre message au joueur…"
                    className="w-full resize-y rounded-xl border border-white/10 bg-[#0a0d12] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void sendReply()}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 py-2.5 text-sm font-bold text-[#020617] disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                    Envoyer la réponse
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-slate-600">
                  Ticket clos — rouvrez-le pour ajouter une réponse.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
