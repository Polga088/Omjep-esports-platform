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
      .then((r) => {
        const d = r.data;
        setMe({
          ...d,
          level: typeof d.level === 'number' && Number.isFinite(d.level) ? d.level : 1,
        });
      })
      .catch(() => setErr('Session invalide.'));
  }, []);

  if (err) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-mono text-lg font-medium uppercase tracking-wider text-slate-300">
            Messagerie
          </h1>
          <p className="mt-1 font-mono text-[11px] text-slate-600">Salon club · messages privés</p>
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
      <div className="relative z-0 flex min-h-[40vh] items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="relative z-0 space-y-6">
      <div>
        <h1 className="font-mono text-lg font-medium uppercase tracking-wider text-slate-300">
          Messagerie
        </h1>
        <p className="mt-1 font-mono text-[11px] text-slate-600">Salon club · messages privés</p>
      </div>
      <ChatBox me={me} />
    </div>
  );
}
