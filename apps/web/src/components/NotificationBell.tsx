import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { getNotificationHref } from '@/lib/notificationNavigation';
import type { DbNotificationRow } from '@/hooks/useAppNotifications';

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

function formatNotifDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface NotificationBellProps {
  appUnreadCount?: number;
  inboxNotifications?: DbNotificationRow[];
  /** Après lecture / refresh liste + compteur */
  onRefreshInbox?: () => void | Promise<void>;
}

export default function NotificationBell({
  appUnreadCount = 0,
  inboxNotifications = [],
  onRefreshInbox,
}: NotificationBellProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [open, setOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState(0);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
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

  useEffect(() => {
    if (open) {
      void onRefreshInbox?.();
    }
  }, [open, onRefreshInbox]);

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
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Erreur lors de la réponse.';
      toast.error(msg ?? 'Erreur.');
    } finally {
      setRespondingId(null);
    }
  };

  const handleNotificationClick = async (n: DbNotificationRow) => {
    const href = getNotificationHref(n.metadata);
    setMarkingReadId(n.id);
    try {
      if (!n.is_read) {
        await api.patch(`/notifications/${n.id}/read`);
        await onRefreshInbox?.();
      }
      setOpen(false);
      navigate(href);
    } catch {
      toast.error('Impossible de marquer la notification comme lue.');
    } finally {
      setMarkingReadId(null);
    }
  };

  const inviteCount = invitations.length;
  const inboxCount = inboxNotifications.length;
  const totalBadge = inviteCount + appUnreadCount;
  const hasNew = totalBadge > 0;
  const isEmpty = inviteCount === 0 && inboxCount === 0;

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
            <span className="relative inline-flex min-w-[1rem] h-4 px-0.5 justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {totalBadge > 9 ? '9+' : totalBadge}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0D1221] shadow-2xl shadow-black/40 z-50 overflow-hidden flex flex-col max-h-[min(28rem,85vh)]"
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {(inviteCount > 0 || appUnreadCount > 0) && (
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                {inviteCount > 0 && `${inviteCount} invitation${inviteCount > 1 ? 's' : ''}`}
                {inviteCount > 0 && appUnreadCount > 0 && ' · '}
                {appUnreadCount > 0 && `${appUnreadCount} non lue${appUnreadCount > 1 ? 's' : ''}`}
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {isEmpty ? (
              <div className="py-10 text-center px-4">
                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Aucune notification pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {inviteCount > 0 && (
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500/90 px-1 mb-2">
                      Invitations club
                    </p>
                    <ul className="space-y-1">
                      {invitations.map((inv) => {
                        const isResponding = respondingId === inv.id;
                        return (
                          <li
                            key={inv.id}
                            className="rounded-xl px-3 py-2.5 bg-white/[0.03] border border-white/5"
                          >
                            <div className="flex items-start gap-3">
                              {inv.team.logo_url ? (
                                <img
                                  src={inv.team.logo_url}
                                  alt={inv.team.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-white/10 flex items-center justify-center text-sm font-bold text-amber-400 uppercase shrink-0">
                                  {inv.team.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">
                                  <span className="font-semibold text-amber-400">{inv.team.name}</span>{' '}
                                  vous invite à rejoindre !
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Par {inv.inviter.ea_persona_name ?? inv.inviter.email}
                                </p>
                                <p className="text-[10px] text-slate-600 mt-1">
                                  {formatNotifDate(inv.created_at)}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    type="button"
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
                                    type="button"
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
                  </div>
                )}

                {inboxCount > 0 && (
                  <div className="px-3 py-2 pb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 mb-2">
                      Centre de messages
                    </p>
                    <ul className="space-y-1">
                      {inboxNotifications.map((n) => {
                        const busy = markingReadId === n.id;
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleNotificationClick(n)}
                              className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
                                n.is_read
                                  ? 'border-transparent bg-transparent hover:bg-white/[0.04]'
                                  : 'border-sky-500/25 bg-sky-500/[0.06] hover:bg-sky-500/10'
                              } disabled:opacity-60`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-white leading-snug">{n.title}</p>
                                {!n.is_read && (
                                  <span className="shrink-0 h-2 w-2 rounded-full bg-sky-400 mt-1.5" aria-hidden />
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-3">{n.message}</p>
                              <p className="text-[10px] text-slate-600 mt-1.5">{formatNotifDate(n.created_at)}</p>
                              {busy && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500 mt-2" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
