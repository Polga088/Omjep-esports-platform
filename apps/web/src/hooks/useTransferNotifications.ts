import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: {
    type?: string;
    offer_id?: string;
  } | null;
  created_at: string;
}

const POLL_INTERVAL = 15_000;

export function useTransferNotifications() {
  const [showConfetti, setShowConfetti] = useState(false);
  const lastSeenRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get<Notification[]>('/notifications');

      const transferNotifs = data.filter(
        (n) =>
          !n.is_read &&
          n.metadata?.type &&
          [
            'TRANSFER_OFFER_RECEIVED',
            'TRANSFER_OFFER_ACCEPTED',
            'TRANSFER_OFFER_REJECTED',
            'PLAYER_TRANSFERRED',
            'TRANSFER_COUNTER',
            'TRANSFER_NEGOTIATION',
          ].includes(n.metadata.type),
      );

      if (transferNotifs.length === 0) return;

      const latest = transferNotifs[0];
      if (initialLoadRef.current) {
        lastSeenRef.current = latest.id;
        initialLoadRef.current = false;
        return;
      }

      if (latest.id === lastSeenRef.current) return;
      lastSeenRef.current = latest.id;

      const type = latest.metadata?.type;

      if (type === 'TRANSFER_OFFER_ACCEPTED' || type === 'PLAYER_TRANSFERRED') {
        toast.success(latest.message, {
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #0D1221 0%, #1a1a2e 100%)',
            border: '1px solid rgba(255,215,0,0.3)',
            color: '#FFD700',
          },
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      } else if (type === 'TRANSFER_OFFER_RECEIVED') {
        toast.info(latest.message, { duration: 5000 });
      } else if (type === 'TRANSFER_OFFER_REJECTED') {
        toast(latest.message, { duration: 5000 });
      }

      await api.patch(`/notifications/${latest.id}/read`);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [poll]);

  return { showConfetti };
}
