import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ChatBox } from '@/features/chat';
import { Loader2 } from 'lucide-react';

type Me = { id: string; email: string; role?: string };

export default function ChatPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Me>('/auth/me')
      .then((r) => setMe(r.data))
      .catch(() => setErr('Session invalide.'));
  }, []);

  if (err) {
    return <p className="text-sm text-red-400">{err}</p>;
  }
  if (!me) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Messagerie</h1>
        <p className="text-xs text-slate-500 mt-1">Salon de club et messages privés entre managers</p>
      </div>
      <ChatBox me={me} />
    </div>
  );
}
