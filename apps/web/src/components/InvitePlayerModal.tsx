import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Props {
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export default function InvitePlayerModal({ teamId, open, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEmail('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      await api.post('/invitations', { team_id: teamId, invitee_email: email.trim() });
      toast.success('Invitation envoyée !');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erreur lors de l'envoi de l'invitation.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#0D1221] shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Inviter un joueur</h2>
            <p className="text-xs text-slate-500 mt-0.5">Envoyez un contrat via son adresse e-mail</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="invitee-email" className="block text-sm font-medium text-slate-400 mb-2">
              Adresse e-mail du joueur
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                ref={inputRef}
                id="invitee-email"
                type="email"
                required
                placeholder="joueur@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#00D4FF]/40 focus:ring-1 focus:ring-[#00D4FF]/20 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#00D4FF] to-[#0099BB] text-[#0A0E1A] shadow-lg shadow-[#00D4FF]/20 hover:shadow-[#00D4FF]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? 'Envoi en cours…' : 'Envoyer le contrat'}
          </button>
        </form>
      </div>
    </div>
  );
}
