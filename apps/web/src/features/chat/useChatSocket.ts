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
  /** Alias historique — préférer `isConnected`. */
  connected: boolean;
  isConnected: boolean;
} {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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

    const onConnect = () => {
      console.log('Socket Mercato/Chat connecté:', s.id);
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (err: Error) => {
      console.warn('[chat] socket connect_error', err?.message ?? err);
      setIsConnected(false);
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, [meId]);

  return { socket, connected: isConnected, isConnected };
}
