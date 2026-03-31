import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock,
  ImagePlus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card } from '@omjep/ui';
import api from '@/lib/api';

const LOGO_MAX_BYTES = 400 * 1024;

type ManagedClub = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  validation_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
};

function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Veuillez choisir une image (PNG, JPG, WebP…).'));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      reject(new Error(`Le logo ne doit pas dépasser ${LOGO_MAX_BYTES / 1024} Ko.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === 'string') resolve(r);
      else reject(new Error('Lecture du fichier impossible.'));
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

export default function ManagerClub() {
  const navigate = useNavigate();
  const [managed, setManaged] = useState<ManagedClub | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ManagedClub | null>('/clubs/me');
      setManaged(data ?? null);
    } catch {
      toast.error('Impossible de charger les informations du club.');
      setManaged(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    try {
      const dataUrl = await readLogoFile(file);
      setLogoDataUrl(dataUrl);
      setLogoPreview(dataUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Fichier invalide.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Le nom du club est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/clubs/request', {
        name: trimmed,
        description: description.trim() || undefined,
        logo_url: logoDataUrl ?? undefined,
      });
      toast.success('Demande envoyée.');
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      setFormError(typeof text === 'string' ? text : 'Envoi impossible. Réessayez plus tard.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || managed === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (managed?.validation_status === 'PENDING') {
    return (
      <div className="max-w-2xl space-y-6">
        <header className="relative rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/5 via-transparent to-transparent p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-400/5 blur-[80px] pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-white tracking-tight">
                Club en attente de validation
              </h1>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Votre demande pour le club{' '}
                <span className="text-amber-200 font-semibold">{managed.name}</span> a bien été
                reçue. L&apos;équipe OMJEP examine votre dossier. Vous serez informé dès qu&apos;une
                décision est prise.
              </p>
            </div>
          </div>
        </header>

        <Card variant="flat" className="p-6 border-white/[0.06] space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
              {managed.logo_url ? (
                <img src={managed.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-slate-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Club</p>
              <p className="text-lg font-semibold text-white truncate">{managed.name}</p>
              {managed.description && (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{managed.description}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 tabular-nums">
            Demande envoyée le {new Date(managed.created_at).toLocaleString('fr-FR')}
          </p>
        </Card>
      </div>
    );
  }

  if (managed?.validation_status === 'APPROVED') {
    return (
      <div className="max-w-2xl space-y-6">
        <Card variant="flat" className="p-8 border-emerald-500/20 bg-emerald-500/5 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h1 className="font-display font-bold text-xl text-white">Club validé</h1>
          <p className="text-slate-400 text-sm">
            {managed.name} est actif sur OMJEP. Accédez à votre espace équipe pour gérer le club.
          </p>
          <Button variant="gold" type="button" onClick={() => navigate('/dashboard/team')}>
            Mon équipe
          </Button>
        </Card>
      </div>
    );
  }

  if (managed?.validation_status === 'REJECTED') {
    return (
      <div className="max-w-2xl space-y-6">
        <Card variant="flat" className="p-8 border-red-500/20 bg-red-500/5 space-y-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-10 h-10 text-red-400 shrink-0" />
            <div>
              <h1 className="font-display font-bold text-xl text-white">Demande non retenue</h1>
              <p className="text-slate-400 text-sm mt-1">
                La validation de « {managed.name} » a été refusée par l&apos;équipe OMJEP. Pour toute
                question, contactez le support officiel.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <header className="relative rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/5 via-transparent to-transparent p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-400/5 blur-[80px] pointer-events-none" />
        <div className="relative">
          <h1 className="font-display font-bold text-2xl text-white mb-2 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-amber-400" />
            Créer mon club
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
            Renseignez les informations de votre club Pro Clubs. Après envoi, l&apos;équipe OMJEP
            validera votre demande avant activation sur la plateforme.
          </p>
        </div>
      </header>

      {formError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {formError}
        </div>
      )}

      <Card variant="flat" className="p-6 md:p-8 border-white/[0.06]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="club-name" className="block text-sm font-medium text-slate-300">
              Nom du club <span className="text-red-400">*</span>
            </label>
            <input
              id="club-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              placeholder="Ex : Eagles Casablanca"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 px-4 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 hover:border-white/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="club-desc" className="block text-sm font-medium text-slate-300">
              Description
            </label>
            <textarea
              id="club-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="Présentez votre club, vos objectifs, votre communauté…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 px-4 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 hover:border-white/20 resize-y min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-300">Logo</span>
            <div className="flex flex-wrap items-start gap-4">
              <label className="flex flex-col items-center justify-center w-28 h-28 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] cursor-pointer hover:border-amber-400/40 hover:bg-amber-400/5 transition-colors shrink-0">
                <input type="file" accept="image/*" className="sr-only" onChange={onLogoChange} />
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-full h-full object-cover rounded-[10px]" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-slate-500 text-xs p-2 text-center">
                    <ImagePlus className="w-6 h-6 text-slate-500" />
                    Ajouter
                  </span>
                )}
              </label>
              <p className="text-xs text-slate-500 max-w-sm pt-1">
                PNG, JPG ou WebP — max. {LOGO_MAX_BYTES / 1024} Ko. Le logo sera visible par les
                administrateurs lors de la validation.
              </p>
            </div>
          </div>

          <Button type="submit" variant="gold" loading={submitting} disabled={submitting} className="w-full sm:w-auto">
            Envoyer la demande
          </Button>
        </form>
      </Card>

      <p className="text-xs text-slate-600 text-center">
        Après soumission, un message confirmera que votre club est en attente de validation par
        l&apos;équipe OMJEP.
      </p>
    </div>
  );
}
