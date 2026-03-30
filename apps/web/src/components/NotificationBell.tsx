import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface InvitationTeam {
  id: string;
  name: string;
  logo_url: string | null;
  platform?: string;
}

interface Invitation {
  id: string;
  team: InvitationTeam;
  inviter: { id: string; ea_persona_name: string | null; email: string };
  created_at: string;
}

const POLL_INTERVAL = 30_000;

export default function NotificationBell() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [open, setOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const fetchInvitations = useCallback(async () => {
    try {
      const { data } = await api.get<Invitation[]>('/invitations/my-pending');
      setInvitations((prev) => {
        if (data.length > prev.length && prev.length > 0) {
          setPrevCount(data.length);
        }
        return data;
      });
    } catch {
      // silently ignore — user may not have pending invitations
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  useEffect(() => {
    if (invitations.length > prevCount && prevCount > 0) {
      toast.info('Nouvelle invitation reçue !');
    }
    setPrevCount(invitations.length);
  }, [invitations.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRespond = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    setRespondingId(id);
    try {
      await api.patch(`/invitations/${id}/respond`, { status });
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));

      if (status === 'ACCEPTED') {
        toast.success('Bienvenue dans votre nouveau club !');
        setOpen(false);
        navigate('/dashboard/team', { replace: true });
        window.location.reload();
      } else {
        toast('Invitation refusée.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erreur lors de la réponse.';
      toast.error(msg);
    } finally {
      setRespondingId(null);
    }
  };

  const count = invitations.length;
  const hasNew = count > 0;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {hasNew && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
            <span className="absolute inline-flex h-4 w-4 rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white">
              {count > 9 ? '9+' : count}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0D1221] shadow-2xl shadow-black/40 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Mercato — Invitations</h3>
            {count > 0 && (
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                {count} en attente
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {invitations.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Aucune invitation pour le moment.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {invitations.map((inv) => {
                  const isResponding = respondingId === inv.id;
                  return (
                    <li key={inv.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-start gap-3">
                        {inv.team.logo_url ? (
                          <img
                            src={inv.team.logo_url}
                            alt={inv.team.name}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#FF6B35]/10 border border-white/10 flex items-center justify-center text-sm font-bold text-[#00D4FF] uppercase shrink-0">
                            {inv.team.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-semibold text-[#00D4FF]">{inv.team.name}</span>
                            {' '}vous invite à rejoindre !
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Envoyée par {inv.inviter.ea_persona_name ?? inv.inviter.email}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleRespond(inv.id, 'ACCEPTED')}
                              disabled={isResponding}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
                            >
                              {isResponding ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              Accepter
                            </button>
                            <button
                              onClick={() => handleRespond(inv.id, 'REJECTED')}
                              disabled={isResponding}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                              Refuser
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
