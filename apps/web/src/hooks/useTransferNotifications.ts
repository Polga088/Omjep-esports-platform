import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/lib/api';
import { useChatSocket } from '@/features/chat/useChatSocket';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Pastille Mercato + confetti transfert : pilotés par `useAppNotifications` (événements window).
 */
export function useTransferNotifications() {
  const location = useLocation();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { socket } = useChatSocket(userId);

  const [showConfetti, setShowConfetti] = useState(false);
  const [mercatoLiveBadge, setMercatoLiveBadge] = useState(false);

  /** Rejoindre la room club (messagerie / autres événements team). */
  useEffect(() => {
    if (!socket || !userId) return;
    let cancelled = false;
    const joinTeamRoom = () => {
      void api
        .get<{ id: string }>('/teams/my-team')
        .then(({ data }) => {
          if (!cancelled && data?.id) {
            socket.emit('join_team', { teamId: data.id });
          }
        })
        .catch(() => {});
    };
    joinTeamRoom();
    socket.on('connect', joinTeamRoom);
    return () => {
      cancelled = true;
      socket.off('connect', joinTeamRoom);
    };
  }, [socket, userId]);

  useEffect(() => {
    const onBadge = () => setMercatoLiveBadge(true);
    const onConfetti = () => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    };
    window.addEventListener('omjep:mercato-badge', onBadge);
    window.addEventListener('omjep:transfer-confetti', onConfetti);
    return () => {
      window.removeEventListener('omjep:mercato-badge', onBadge);
      window.removeEventListener('omjep:transfer-confetti', onConfetti);
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/transfers')) {
      setMercatoLiveBadge(false);
    }
  }, [location.pathname]);

  return { showConfetti, mercatoLiveBadge };
}
