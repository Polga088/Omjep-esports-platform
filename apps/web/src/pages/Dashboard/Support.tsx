import { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, Loader2, Send, Terminal } from 'lucide-react';
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

function statusBadge(status: TicketStatus) {
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

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('BUG');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Ticket[]>('/tickets/my');
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Impossible de charger vos tickets.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = subject.trim();
    const m = message.trim();
    if (s.length < 3) {
      toast.error('Objet trop court (min. 3 caractères).');
      return;
    }
    if (m.length < 10) {
      toast.error('Message trop court (min. 10 caractères).');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/tickets', { subject: s, category, message: m });
      toast.success('Ticket envoyé. L’équipe vous répondra ici.');
      setSubject('');
      setMessage('');
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const t = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(typeof t === 'string' ? t : 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const terminalInput =
    'w-full rounded-md border border-emerald-500/25 bg-[#0a0c0f] px-3 py-2.5 font-mono text-sm text-emerald-100/95 placeholder:text-emerald-700/50 focus:border-emerald-400/45 focus:outline-none focus:ring-1 focus:ring-emerald-500/20';

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-16">
      <div>
        <h1 className="flex items-center gap-3 font-scifi text-xl font-bold tracking-tight text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/40">
            <LifeBuoy className="h-5 w-5 text-emerald-400" />
          </span>
          Support
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Signalez un bug, un litige ou un problème de compte. Réponses visibles ci-dessous.
        </p>
      </div>

      <section
        className="rounded-lg border-[0.5px] border-emerald-500/20 bg-[#080a0c] p-5 shadow-[inset_0_1px_0_rgba(16,185,129,0.06)]"
        aria-labelledby="support-terminal-title"
      >
        <div className="mb-4 flex items-center gap-2 border-b border-emerald-500/10 pb-3">
          <Terminal className="h-4 w-4 text-emerald-500/80" aria-hidden />
          <h2 id="support-terminal-title" className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500/90">
            omjep-support ~ nouveau ticket
          </h2>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-emerald-600/90">
              <span className="text-emerald-500/70">&gt;</span> objet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Résumé du problème"
              className={terminalInput}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-emerald-600/90">
              <span className="text-emerald-500/70">&gt;</span> catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className={`${terminalInput} cursor-pointer appearance-none bg-[#0a0c0f]`}
            >
              <option value="BUG">BUG</option>
              <option value="LITIGE">LITIGE</option>
              <option value="COMPTE">COMPTE</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-emerald-600/90">
              <span className="text-emerald-500/70">&gt;</span> message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Décrivez la situation (captures, dates, IDs utiles)…"
              className={`${terminalInput} resize-y min-h-[120px]`}
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md border border-emerald-500/35 bg-emerald-950/50 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-emerald-200 hover:border-emerald-400/50 hover:bg-emerald-900/30 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              envoyer
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-scifi text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
          Mes tickets
        </h2>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="rounded-lg border-[0.5px] border-white/10 bg-[#08090c] p-8 text-center text-sm text-slate-500">
            Aucun ticket pour l’instant.
          </p>
        ) : (
          <div className="relative">
            <div className="absolute bottom-3 left-[11px] top-3 w-px bg-emerald-500/15" aria-hidden />
            <ul className="relative space-y-0">
              {tickets.map((t) => {
                const d = new Date(t.created_at);
                const datePart = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <li key={t.id} className="relative pb-10 pl-9 last:pb-2">
                    <span
                      className="absolute left-[11px] top-[0.65rem] z-[1] h-2 w-2 -translate-x-1/2 rounded-full border border-emerald-500/30 bg-[#08090c]"
                      aria-hidden
                    />
                    <div className="min-w-0 rounded-md border-l-2 border-emerald-500/25 py-2 pl-3 pr-2">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(t.status)}
                          <span className="rounded-sm border-[0.5px] border-white/12 bg-[#0a0a0c] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            {t.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/40">
                          <span>{datePart}</span>
                          <span className="mx-1 text-white/25">·</span>
                          <span className="font-mono tabular-nums text-white/55">{timePart}</span>
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-white">{t.subject}</p>
                      <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-400">
                        {t.message}
                      </p>
                      {t.replies.length > 0 ? (
                        <ul className="mt-4 space-y-3 border-t border-white/5 pt-3">
                          {t.replies.map((r) => (
                            <li
                              key={r.id}
                              className={`rounded-md border-[0.5px] px-3 py-2 ${
                                r.is_staff
                                  ? 'border-amber-500/20 bg-amber-950/20'
                                  : 'border-white/10 bg-white/[0.02]'
                              }`}
                            >
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                                <span className="font-mono uppercase tracking-wide text-amber-500/80">
                                  {r.is_staff ? 'Équipe OMJEP' : 'Vous'}
                                </span>
                                <span className="font-mono tabular-nums text-slate-600">
                                  {new Date(r.created_at).toLocaleString('fr-FR')}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap font-mono text-xs text-slate-300">{r.body}</p>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
