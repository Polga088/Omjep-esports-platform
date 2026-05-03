import { useCallback, useEffect, useState } from 'react';
import { Headphones, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'

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
    'inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide';
  if (status === 'OPEN') {
    return (
      <span
        className={`${base} border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel-soft))] text-omjep-text-primary`}
        title="Ouvert"
      >
        OUVERT
      </span>
    );
  }
  if (status === 'URGENT') {
    return (
      <span
        className={`${base} border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel-soft))] text-[color-mix(in_srgb,var(--omjep-accent-gold)_90%,var(--omjep-text-primary))]`}
        title="Urgent"
      >
        URGENT
      </span>
    );
  }
  return (
    <span
      className={`${base} border-omjep-border/70 bg-omjep-bg-panel-soft text-omjep-text-muted`}
      title="Clos"
    >
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

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-10 overflow-x-hidden pb-16">
      <DashboardPageHeading
        eyebrow="Support Desk"
        title="Support"
        subtitle="Signalez un bug, un litige ou un problème de compte"
      />

      <section
        className="omjep-surface-card border border-omjep-border/80 p-6 shadow-[var(--omjep-shadow-lg)]"
        aria-labelledby="support-form-title"
      >
        <div className="mb-5 flex items-center gap-3 border-b border-omjep-border/60 pb-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft text-omjep-mauve">
            <Headphones className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 id="support-form-title" className="text-sm font-bold text-omjep-text-primary">
              Nouveau ticket
            </h2>
            <p className="mt-0.5 text-xs text-omjep-text-muted">
              Décrivez le problème — nous revenons vers vous sur cette page.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="support-subject"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-omjep-text-secondary"
            >
              Objet
            </label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Résumé du problème"
              className="omjep-field py-2.5 text-sm placeholder:text-omjep-text-muted"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="support-category"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-omjep-text-secondary"
            >
              Catégorie
            </label>
            <select
              id="support-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="omjep-field cursor-pointer py-2.5 text-sm"
            >
              <option value="BUG">BUG</option>
              <option value="LITIGE">LITIGE</option>
              <option value="COMPTE">COMPTE</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="support-message"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-omjep-text-secondary"
            >
              Message
            </label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Décrivez la situation (captures, dates, IDs utiles)…"
              className="omjep-field min-h-[120px] resize-y py-2.5 text-sm placeholder:text-omjep-text-muted"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="omjep-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold normal-case tracking-normal disabled:pointer-events-none disabled:opacity-45"
            >
              {submitting ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Send className="h-4 w-4 shrink-0" />}
              Envoyer
            </button>
          </div>
        </form>
      </section>

      <section className="min-w-0">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-omjep-text-secondary">
          Mes tickets
        </h2>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-omjep-mauve/70" aria-hidden />
          </div>
        ) : tickets.length === 0 ? (
          <p className="rounded-xl border border-omjep-border/70 bg-omjep-bg-panel-soft/80 p-8 text-center text-sm text-omjep-text-secondary">
            Aucun ticket pour l’instant.
          </p>
        ) : (
          <div className="relative min-w-0">
            <div
              className="absolute bottom-3 left-[11px] top-3 w-px bg-[color-mix(in_srgb,var(--omjep-mauve)_22%,var(--omjep-border))]"
              aria-hidden
            />
            <ul className="relative space-y-0">
              {tickets.map((t) => {
                const d = new Date(t.created_at);
                const datePart = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <li key={t.id} className="relative pb-10 pl-9 last:pb-2">
                    <span
                      className="absolute left-[11px] top-[0.65rem] z-[1] h-2 w-2 -translate-x-1/2 rounded-full border border-omjep-border/80 bg-omjep-bg-panel"
                      aria-hidden
                    />
                    <div className="min-w-0 rounded-lg border border-omjep-border/60 border-l-[3px] border-l-[color-mix(in_srgb,var(--omjep-mauve)_55%,var(--omjep-border))] bg-omjep-bg-panel/90 py-2 pl-3 pr-2 dark:bg-omjep-bg-panel-soft/50">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(t.status)}
                          <span className="rounded-md border border-omjep-border/70 bg-omjep-bg-panel-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-omjep-text-secondary">
                            {t.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-omjep-text-muted">
                          <span>{datePart}</span>
                          <span className="mx-1 text-omjep-border">·</span>
                          <span className="tabular-nums text-omjep-text-secondary">{timePart}</span>
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-omjep-text-primary">{t.subject}</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-omjep-text-secondary">
                        {t.message}
                      </p>
                      {t.replies.length > 0 ? (
                        <ul className="mt-4 space-y-3 border-t border-omjep-border/50 pt-3">
                          {t.replies.map((r) => (
                            <li
                              key={r.id}
                              className={`rounded-lg border px-3 py-2 ${
                                r.is_staff
                                  ? 'border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel-soft))]'
                                  : 'border-omjep-border/60 bg-omjep-bg-panel-soft/70'
                              }`}
                            >
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-omjep-text-muted">
                                <span className="font-semibold uppercase tracking-wide text-omjep-text-secondary">
                                  {r.is_staff ? 'Équipe OMJEP' : 'Vous'}
                                </span>
                                <span className="tabular-nums text-omjep-text-muted">
                                  {new Date(r.created_at).toLocaleString('fr-FR')}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-xs text-omjep-text-primary">{r.body}</p>
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
