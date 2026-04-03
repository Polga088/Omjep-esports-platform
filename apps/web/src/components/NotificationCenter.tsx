import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { getNotificationTarget } from '@/lib/notificationNavigation';
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

function typeLabel(t: string): string {
  switch (t) {
    case 'MATCH':
      return 'MATCH';
    case 'TRANSFER':
      return 'TRANSFER';
    case 'SUPPORT':
      return 'SUPPORT';
    case 'SYSTEM':
      return 'SYSTEM';
    default:
      return t || '—';
  }
}

interface NotificationCenterProps {
  appUnreadCount?: number;
  inboxNotifications?: DbNotificationRow[];
  onRefreshInbox?: () => void | Promise<void>;
}

export default function NotificationCenter({
  appUnreadCount = 0,
  inboxNotifications = [],
  onRefreshInbox,
}: NotificationCenterProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [open, setOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState(0);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
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
      // silently ignore
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
    const href = getNotificationTarget(n);
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

  const handleMarkAllRead = async () => {
    if (appUnreadCount <= 0) return;
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      await onRefreshInbox?.();
      toast.success('Toutes les notifications sont marquées comme lues.');
    } catch {
      toast.error('Impossible de tout marquer comme lu.');
    } finally {
      setMarkingAll(false);
    }
  };

  const inviteCount = invitations.length;
  const inboxCount = inboxNotifications.length;
  const isEmpty = inviteCount === 0 && inboxCount === 0;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {appUnreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center">
            <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
              {appUnreadCount > 9 ? '9+' : appUnreadCount}
            </span>
          </span>
        )}
        {appUnreadCount === 0 && inviteCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[10px] font-bold text-black">
            {inviteCount > 9 ? '9+' : inviteCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-2 flex max-h-[min(28rem,85vh)] w-80 flex-col overflow-hidden rounded-xl border-[0.5px] border-white/10 bg-[#08090c] shadow-2xl shadow-black/50 sm:w-96"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              omjep-notify ~
            </h3>
            <div className="flex items-center gap-2">
              {appUnreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  onClick={() => void handleMarkAllRead()}
                  className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-500 transition hover:border-white/20 hover:text-slate-300 disabled:opacity-50"
                >
                  {markingAll ? '…' : 'Tout lu'}
                </button>
              )}
              {(inviteCount > 0 || appUnreadCount > 0) && (
                <span className="font-mono text-[10px] text-slate-600">
                  {inviteCount > 0 && `${inviteCount} inv.`}
                  {inviteCount > 0 && appUnreadCount > 0 && ' · '}
                  {appUnreadCount > 0 && `${appUnreadCount} non lu${appUnreadCount > 1 ? 's' : ''}`}
                </span>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isEmpty ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-slate-700" />
                <p className="font-mono text-[10px] text-slate-600">Aucune entrée.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {inviteCount > 0 && (
                  <div className="px-2 py-2">
                    <p className="mb-2 px-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-amber-500/90">
                      invitations
                    </p>
                    <ul className="space-y-1">
                      {invitations.map((inv) => {
                        const isResponding = respondingId === inv.id;
                        return (
                          <li
                            key={inv.id}
                            className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"
                          >
                            <div className="flex items-start gap-2">
                              {inv.team.logo_url ? (
                                <img
                                  src={inv.team.logo_url}
                                  alt={inv.team.name}
                                  className="h-9 w-9 shrink-0 rounded-lg border border-white/10 object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-xs font-bold uppercase text-amber-400">
                                  {inv.team.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-white">
                                  <span className="font-semibold text-amber-400">{inv.team.name}</span>{' '}
                                  vous invite.
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  Par {inv.inviter.ea_persona_name ?? inv.inviter.email}
                                </p>
                                <p className="mt-1 font-mono text-[10px] text-slate-600">
                                  {formatNotifDate(inv.created_at)}
                                </p>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRespond(inv.id, 'ACCEPTED')}
                                    disabled={isResponding}
                                    className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                                  >
                                    {isResponding ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                    Accepter
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRespond(inv.id, 'REJECTED')}
                                    disabled={isResponding}
                                    className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                                  >
                                    <X className="h-3 w-3" />
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
                  <div className="px-2 py-2 pb-3">
                    <p className="mb-2 px-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                      inbox
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
                              className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                n.is_read
                                  ? 'border-transparent bg-transparent hover:bg-white/[0.04]'
                                  : 'border-cyan-500/20 bg-cyan-500/[0.05] hover:bg-cyan-500/10'
                              } disabled:opacity-60`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
                                  {typeLabel(n.type)}
                                </span>
                                {!n.is_read && (
                                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
                                )}
                              </div>
                              <p className="mt-0.5 text-sm font-medium leading-snug text-white">{n.title}</p>
                              <p className="mt-1 line-clamp-3 text-xs text-slate-400">{n.message}</p>
                              <p className="mt-1.5 font-mono text-[10px] text-slate-600">
                                {formatNotifDate(n.created_at)}
                              </p>
                              {busy && <Loader2 className="mt-2 h-3.5 w-3.5 animate-spin text-slate-500" />}
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
