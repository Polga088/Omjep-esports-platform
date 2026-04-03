import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ChatBox } from '@/features/chat';
import { Loader2 } from 'lucide-react';
import MaintenancePrestige, { PRESTIGE_MSG } from '@/components/MaintenancePrestige';

type Me = { id: string; email: string; role?: string; level?: number };

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
    return (
      <div className="space-y-6">
        <div>
          <h1 className="ea-fc-hero-neon font-display text-2xl font-black tracking-tight">Tactical Link</h1>
          <p className="mt-1 text-xs text-slate-500">Messagerie sécurisée — salon club &amp; MP managers</p>
        </div>
        <MaintenancePrestige
          title="Session sécurisée"
          message={PRESTIGE_MSG}
          icon="lock"
        />
      </div>
    );
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
        <h1 className="ea-fc-hero-neon font-display text-2xl font-black tracking-tight">Tactical Link</h1>
        <p className="mt-1 text-xs text-slate-500">Messagerie sécurisée — salon club &amp; MP managers</p>
      </div>
      <ChatBox me={me} />
    </div>
  );
}
