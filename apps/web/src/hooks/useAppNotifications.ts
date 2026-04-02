import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useChatSocket } from '@/features/chat/useChatSocket';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppNotificationStore } from '@/store/useAppNotificationStore';

export type AppNotificationPayload = {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  metadata?: Record<string, unknown> | null;
};

export type DbNotificationRow = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const TRANSFER_META_TYPES = new Set([
  'TRANSFER_OFFER_RECEIVED',
  'TRANSFER_OFFER_SENT',
  'TRANSFER_OFFER_REJECTED',
  'TRANSFER_OFFER_CANCELLED',
  'TRANSFER_OFFER_ACCEPTED',
  'TRANSFER_COUNTER',
  'PLAYER_TRANSFERRED',
  'PLAYER_SOLD',
]);

function isTransferMeta(meta: Record<string, unknown> | null | undefined): boolean {
  const t = meta?.type;
  return typeof t === 'string' && TRANSFER_META_TYPES.has(t);
}

function isTransferSuccess(meta: Record<string, unknown> | null | undefined): boolean {
  const t = meta?.type;
  return t === 'TRANSFER_OFFER_ACCEPTED' || t === 'PLAYER_TRANSFERRED';
}

/**
 * Écoute `app:notification` (Socket.io), toasts immédiats (Sonner), compteur non-lus, liste inbox.
 */
export function useAppNotifications() {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { socket } = useChatSocket(userId);
  const setUnreadCount = useAppNotificationStore((s) => s.setUnreadCount);
  const incrementUnread = useAppNotificationStore((s) => s.incrementUnread);

  const [notifications, setNotifications] = useState<DbNotificationRow[]>([]);

  const syncUnread = useCallback(async () => {
    try {
      const { data } = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(typeof data?.count === 'number' ? data.count : 0);
    } catch {
      // silent
    }
  }, [setUnreadCount]);

  const refreshNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<DbNotificationRow[]>('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void syncUnread();
    void refreshNotifications();
  }, [syncUnread, refreshNotifications]);

  useEffect(() => {
    if (!socket) return;

    const onAppNotification = (payload: AppNotificationPayload) => {
      const meta = payload.metadata ?? undefined;
      const type = payload.type ?? 'info';

      if (type === 'success') {
        toast.success(payload.title, { description: payload.message, duration: 5500 });
      } else if (type === 'error') {
        toast.error(payload.title, { description: payload.message, duration: 6500 });
      } else if (type === 'warning') {
        toast.warning(payload.title, { description: payload.message, duration: 5500 });
      } else {
        toast.info(payload.title, { description: payload.message, duration: 5000 });
      }

      incrementUnread();
      void refreshNotifications();
      void syncUnread();

      if (isTransferMeta(meta as Record<string, unknown>)) {
        window.dispatchEvent(
          new CustomEvent('omjep:transfers-refresh', {
            detail: { offerId: (meta as { offer_id?: string })?.offer_id },
          }),
        );
        window.dispatchEvent(new CustomEvent('omjep:mercato-badge'));
      }

      if (isTransferSuccess(meta as Record<string, unknown>)) {
        window.dispatchEvent(new CustomEvent('omjep:transfer-confetti'));
      }

      if (meta && (meta as { category?: string }).category === 'MATCH') {
        window.dispatchEvent(
          new CustomEvent('omjep:matches-refresh', { detail: { matchId: (meta as { match_id?: string }).match_id } }),
        );
      }
    };

    socket.on('app:notification', onAppNotification);
    return () => {
      socket.off('app:notification', onAppNotification);
    };
  }, [socket, incrementUnread, refreshNotifications, syncUnread]);

  return { syncUnread, notifications, refreshNotifications };
}
