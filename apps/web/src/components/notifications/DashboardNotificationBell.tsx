import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { getNotificationTarget } from '@/lib/notificationNavigation';
import { useAppNotifications, type DbNotificationRow } from '@/hooks/useAppNotifications';
import { useAppNotificationStore } from '@/store/useAppNotificationStore';

const FALLBACK_ITEMS: DbNotificationRow[] = [
  {
    id: 'local-1',
    type: 'SYSTEM',
    title: 'Cockpit OMJEP',
    message: 'Les notifications en temps réel apparaîtront ici une fois le service connecté.',
    link: null,
    is_read: true,
    metadata: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'local-2',
    type: 'TRANSFER',
    title: 'Mercato & matchs',
    message: 'Offres transferts et validations de match sont notifiées automatiquement.',
    link: null,
    is_read: true,
    metadata: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'local-3',
    type: 'SYSTEM',
    title: 'Communauté OMJEP',
    message: 'Suivez l’actualité officielle et les annonces sur la page Communauté.',
    link: '/community',
    is_read: true,
    metadata: null,
    created_at: new Date().toISOString(),
  },
];

function formatNotifTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function typeBadgeLabel(t: string): string {
  switch (t) {
    case 'MATCH':
      return 'Match';
    case 'TRANSFER':
      return 'Mercato';
    case 'SUPPORT':
      return 'Support';
    case 'SYSTEM':
      return 'Système';
    case 'INFO':
      return 'Info';
    default:
      return t.length > 10 ? `${t.slice(0, 8)}…` : t;
  }
}

export default function DashboardNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const unreadCount = useAppNotificationStore((s) => s.unreadCount);
  const { notifications, refreshNotifications, syncUnread } = useAppNotifications();

  const listItems = useMemo((): DbNotificationRow[] => {
    if (notifications.length > 0) return notifications.slice(0, 5);
    return FALLBACK_ITEMS;
  }, [notifications]);

  const showFallbackOnly = notifications.length === 0;

  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) void refreshNotifications();
  }, [open, refreshNotifications]);

  const handleRowClick = async (n: DbNotificationRow) => {
    if (showFallbackOnly || n.id.startsWith('local-')) {
      handleClose();
      const href = typeof n.link === 'string' && n.link.trim() ? n.link.trim() : '/community';
      navigate(href);
      return;
    }
    setMarkingId(n.id);
    try {
      if (!n.is_read) {
        await api.patch(`/notifications/${n.id}/read`);
        await refreshNotifications();
        await syncUnread();
      }
      handleClose();
      navigate(getNotificationTarget(n));
    } catch {
      toast.error('Impossible de marquer la notification comme lue.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAll = async () => {
    if (unreadCount <= 0 || showFallbackOnly) return;
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      await refreshNotifications();
      await syncUnread();
      toast.success('Toutes les notifications sont marquées comme lues.');
    } catch {
      toast.error('Impossible de tout marquer comme lu.');
    } finally {
      setMarkingAll(false);
    }
  };

  const badgeCount = unreadCount;
  const ariaLabel =
    badgeCount > 0
      ? `Notifications, ${badgeCount} non lue${badgeCount > 1 ? 's' : ''}`
      : 'Notifications';

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="omjep-dashboard-icon-btn relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-omjep-border/80 bg-omjep-bg-panel-soft/80 text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_45%,var(--omjep-border))] hover:bg-omjep-bg-panel-soft"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-omjep-mauve px-0.5 text-[9px] font-black tabular-nums text-white shadow-sm">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={wrapRef}
          className="omjep-notification-dropdown absolute right-0 top-[calc(100%+0.35rem)] z-[60] flex w-[min(calc(100vw-1.5rem),22rem)] flex-col overflow-hidden rounded-xl border border-omjep-border/90 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_96%,#070d18)] shadow-[var(--omjep-shadow-lg)] backdrop-blur-xl"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex flex-col gap-0.5 border-b border-omjep-border/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-muted">Notifications</p>
              <div className="flex items-center gap-2">
                {!showFallbackOnly && unreadCount > 0 ? (
                  <button
                    type="button"
                    disabled={markingAll}
                    onClick={() => void handleMarkAll()}
                    className="rounded-md border border-omjep-border/70 px-2 py-1 text-[10px] font-semibold text-omjep-text-secondary transition hover:border-omjep-mauve/40 hover:text-omjep-text-primary disabled:opacity-50"
                  >
                    {markingAll ? '…' : 'Tout lu'}
                  </button>
                ) : null}
              </div>
            </div>
            {showFallbackOnly ? (
              <p className="text-[10px] text-omjep-text-muted">Aperçu — connexion inbox en attente</p>
            ) : null}
          </div>

          <div className="max-h-[min(22rem,70vh)] overflow-y-auto overscroll-contain">
            {listItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-omjep-text-muted opacity-50" aria-hidden />
                <p className="text-sm text-omjep-text-secondary">Aucune notification récente.</p>
              </div>
            ) : (
              <ul className="divide-y divide-omjep-border/40">
                {listItems.map((n) => {
                  const busy = markingId === n.id;
                  const unread = !n.is_read && !showFallbackOnly;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRowClick(n)}
                        className={`flex w-full gap-2 px-3 py-2.5 text-left transition hover:bg-omjep-bg-panel-soft/60 ${
                          unread ? 'bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,transparent)]' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded border border-omjep-border/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-omjep-text-muted">
                              {typeBadgeLabel(n.type)}
                            </span>
                            {unread ? (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-omjep-mauve" aria-hidden />
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-1 text-sm font-semibold text-omjep-text-primary">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-omjep-text-secondary">{n.message}</p>
                          <p className="mt-1.5 text-[10px] tabular-nums text-omjep-text-muted">
                            {formatNotifTime(n.created_at)}
                          </p>
                        </div>
                        {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-omjep-mauve" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-omjep-border/60 bg-omjep-bg-panel-soft/40 px-2 py-2">
            <Link
              to="/community"
              onClick={handleClose}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold text-omjep-text-primary transition hover:bg-omjep-bg-panel-soft/80"
            >
              <span>Tout voir — Communauté</span>
              <ChevronRight className="h-4 w-4 text-omjep-mauve" aria-hidden />
            </Link>
            <Link
              to="/dashboard/support"
              onClick={handleClose}
              className="mt-0.5 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] text-omjep-text-secondary transition hover:bg-omjep-bg-panel-soft/60 hover:text-omjep-text-primary"
            >
              Centre d’aide
              <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
