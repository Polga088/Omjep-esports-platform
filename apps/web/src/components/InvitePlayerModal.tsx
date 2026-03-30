import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Mail, Gamepad2, Info } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

type InviteTab = 'ea' | 'email';

interface Props {
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export default function InvitePlayerModal({ teamId, open, onClose }: Props) {
  const [tab, setTab] = useState<InviteTab>('ea');
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setFieldError('');
      setTab('ea');
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

  const switchTab = (next: InviteTab) => {
    setTab(next);
    setValue('');
    setFieldError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setFieldError('');

    setSending(true);
    try {
      const body =
        tab === 'ea'
          ? { team_id: teamId, ea_persona_name: value.trim() }
          : { team_id: teamId, invitee_email: value.trim() };

      await api.post('/invitations', body);
      toast.success('Invitation envoyée !');
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Erreur lors de l'envoi de l'invitation.";
      setFieldError(msg);
    } finally {
      setSending(false);
    }
  };

  const tabItems: { key: InviteTab; label: string; icon: typeof Mail }[] = [
    { key: 'ea', label: 'Par Pseudo EA', icon: Gamepad2 },
    { key: 'email', label: 'Par Email', icon: Mail },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#0D1221] shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Inviter un joueur</h2>
            <p className="text-xs text-slate-500 mt-0.5">Envoyez un contrat de recrutement</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {tabItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                tab === key
                  ? 'text-[#FFD700]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {tab === key && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label
              htmlFor="invite-field"
              className="block text-sm font-medium text-slate-400 mb-2"
            >
              {tab === 'ea' ? 'Identifiant EA Sports' : 'Adresse e-mail du joueur'}
            </label>
            <div className="relative">
              {tab === 'ea' ? (
                <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              ) : (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              )}
              <input
                ref={inputRef}
                id="invite-field"
                type={tab === 'email' ? 'email' : 'text'}
                required
                placeholder={tab === 'ea' ? 'ex: MoroccanEagle_99' : 'joueur@example.com'}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (fieldError) setFieldError('');
                }}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border text-white text-sm placeholder:text-slate-600 focus:outline-none transition-colors ${
                  fieldError
                    ? 'border-red-500/60 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/30'
                    : 'border-white/10 focus:border-[#FFD700]/40 focus:ring-1 focus:ring-[#FFD700]/20'
                }`}
              />
            </div>
            {fieldError && (
              <p className="mt-2 text-xs text-red-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] text-red-400">!</span>
                {fieldError}
              </p>
            )}
          </div>

          {tab === 'ea' && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#FFD700]/5 border border-[#FFD700]/10">
              <Info className="w-3.5 h-3.5 text-[#FFD700]/60 shrink-0 mt-0.5" />
              <p className="text-xs text-[#FFD700]/60 leading-relaxed">
                L'invitation par pseudo nécessite que le joueur soit déjà inscrit sur la plateforme.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !value.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0E1A] shadow-lg shadow-[#FFD700]/20 hover:shadow-[#FFD700]/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
