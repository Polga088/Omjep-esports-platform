import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export const CHAT_SOCKET_PATH = '/socket.io';

/**
 * URL du serveur API (Socket.io sur le même hôte que Nest).
 * En dev avec proxy Vite, laisser vide : même origine que le front (`window.location.origin`).
 */
export function getSocketBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (typeof env === 'string' && env.trim().length > 0) {
    return env.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function useChatSocket(meId: string): {
  socket: Socket | null;
  connected: boolean;
} {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const base = getSocketBaseUrl();
    const s = io(`${base}/chat`, {
      path: CHAT_SOCKET_PATH,
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    setSocket(s);

    s.on('connect', () => {
      console.log('[chat] socket connecté', s.id);
      setConnected(true);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      s.removeAllListeners();
      s.close();
      setSocket(null);
      setConnected(false);
    };
  }, [meId]);

  return { socket, connected };
}
