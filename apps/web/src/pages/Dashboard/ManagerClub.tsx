import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ImagePlus,
  Loader2,
  AlertCircle,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@omjep/ui';
import api from '@/lib/api';
import DashboardPageHeading from '@/components/dashboard/DashboardPageHeading'
import { Platform } from '@omjep/shared';

const REQUEST_LOGO_MAX_BYTES = 400 * 1024;
const CLUB_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

type ManagedClub = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  platform: Platform;
  primaryColor: string | null;
  secondaryColor: string | null;
  proclubs_url: string | null;
  validation_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
};

type ClubFormState = {
  name: string;
  description: string;
  platform: Platform;
  primaryColor: string;
  secondaryColor: string;
  proclubs_url: string;
};

function readRequestLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error('Veuillez choisir une image (PNG, JPG, WebP…).'));
      return;
    }
    if (file.size > REQUEST_LOGO_MAX_BYTES) {
      reject(new Error(`Le logo ne doit pas dépasser ${REQUEST_LOGO_MAX_BYTES / 1024} Ko.`));
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
  const [managed, setManaged] = useState<ManagedClub | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestLogoPreview, setRequestLogoPreview] = useState<string | null>(null);
  const [requestLogoDataUrl, setRequestLogoDataUrl] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ClubFormState | null>(null);
  const [initialEditForm, setInitialEditForm] = useState<ClubFormState | null>(null);
  const [managedLogoPreview, setManagedLogoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const platformOptions: Platform[] = ['CROSSPLAY', 'PS5', 'XBOX', 'PC'];

  const normalizeManagedToForm = useCallback((club: ManagedClub): ClubFormState => {
    return {
      name: club.name ?? '',
      description: club.description ?? '',
      platform: club.platform ?? 'CROSSPLAY',
      primaryColor: club.primaryColor ?? '#5B21B6',
      secondaryColor: club.secondaryColor ?? '#F59E0B',
      proclubs_url: club.proclubs_url ?? '',
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ManagedClub | null>('/clubs/me');
      const club = data ?? null;
      setManaged(club);
      if (club) {
        const normalized = normalizeManagedToForm(club);
        setEditForm(normalized);
        setInitialEditForm(normalized);
        setManagedLogoPreview(club.logo_url);
      }
    } catch {
      toast.error('Impossible de charger les informations du club.');
      setManaged(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, normalizeManagedToForm]);

  const onRequestLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    try {
      const dataUrl = await readRequestLogoFile(file);
      setRequestLogoDataUrl(dataUrl);
      setRequestLogoPreview(dataUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Fichier invalide.');
    }
  };

  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = requestName.trim();
    if (!trimmed) {
      setFormError('Le nom du club est obligatoire.');
      return;
    }
    setRequestSubmitting(true);
    try {
      await api.post('/clubs/request', {
        name: trimmed,
        description: requestDescription.trim() || undefined,
        logo_url: requestLogoDataUrl ?? undefined,
      });
      toast.success('Demande envoyée.');
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      setFormError(typeof text === 'string' ? text : 'Envoi impossible. Réessayez plus tard.');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleManagedLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !managed) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError('Format logo invalide. Utilisez PNG, JPG, JPEG ou WebP.');
      return;
    }
    if (file.size > CLUB_LOGO_MAX_BYTES) {
      setFormError('Le logo dépasse la taille maximale de 2MB.');
      return;
    }

    setFormError(null);
    setManagedLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);

    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ logo_url: string | null }>('/clubs/me/logo', form);
      setManaged((prev) => (prev ? { ...prev, logo_url: data.logo_url ?? null } : prev));
      toast.success('Logo du club mis à jour.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      setFormError(typeof text === 'string' ? text : 'Upload logo impossible.');
      setManagedLogoPreview(managed.logo_url);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleManagedSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setUpdateSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || '',
        platform: editForm.platform,
        primaryColor: editForm.primaryColor,
        secondaryColor: editForm.secondaryColor,
        proclubs_url: editForm.proclubs_url.trim() || '',
      };
      await api.patch('/clubs/me', payload);
      toast.success('Informations du club mises à jour.');
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      setFormError(typeof text === 'string' ? text : 'Sauvegarde impossible.');
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const handleCancelManagedChanges = () => {
    if (!initialEditForm) return;
    setEditForm(initialEditForm);
    setManagedLogoPreview(managed?.logo_url ?? null);
    setFormError(null);
  };

  const isManagedFormDirty = useMemo(() => {
    if (!editForm || !initialEditForm) return false;
    return JSON.stringify(editForm) !== JSON.stringify(initialEditForm);
  }, [editForm, initialEditForm]);

  if (loading || managed === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-omjep-mauve" />
      </div>
    );
  }

  if (managed) {
    return (
      <div className="max-w-4xl space-y-6">
        <header className="omjep-surface-card relative overflow-hidden p-5 md:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-omjep-gold/[0.07] blur-3xl" />
          <div className="relative">
            <DashboardPageHeading
              eyebrow="Club Management"
              title="Gestion club"
              subtitle="Modifiez les informations de votre club en toute sécurité"
              className="border-b-0 pb-1"
            />
            <p className="mt-2 text-sm text-omjep-text-secondary">
              Statut actuel :{' '}
              <span className="font-semibold text-omjep-text-primary">{managed.validation_status}</span>
            </p>
          </div>
        </header>

        {formError && (
          <div className="flex items-center gap-2 rounded-xl border border-omjep-danger/30 bg-omjep-danger/10 px-4 py-3 text-sm text-omjep-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="omjep-surface-card p-5 md:p-6">
          <form onSubmit={handleManagedSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div className="space-y-1.5">
                <label htmlFor="club-name" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                  Nom du club
                </label>
                <input
                  id="club-name"
                  type="text"
                  value={editForm?.name ?? ''}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  maxLength={50}
                  required
                  className="omjep-field text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="club-platform" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                  Plateforme
                </label>
                <select
                  id="club-platform"
                  value={editForm?.platform ?? 'CROSSPLAY'}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, platform: e.target.value as Platform } : prev,
                    )
                  }
                  className="omjep-field text-sm"
                >
                  {platformOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="club-description" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                Description
              </label>
              <textarea
                id="club-description"
                value={editForm?.description ?? ''}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                maxLength={4000}
                rows={3}
                className="omjep-field min-h-[5.5rem] resize-y text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="club-proclubs-url" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                Lien Pro Clubs / EA
              </label>
              <input
                id="club-proclubs-url"
                type="url"
                value={editForm?.proclubs_url ?? ''}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, proclubs_url: e.target.value } : prev))}
                maxLength={2048}
                placeholder="https://proclubs.io/club/..."
                className="omjep-field text-sm placeholder:text-omjep-text-muted"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div className="space-y-1.5">
                <label htmlFor="club-primary-color" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                  Couleur principale
                </label>
                <input
                  id="club-primary-color"
                  type="color"
                  value={editForm?.primaryColor ?? '#5B21B6'}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, primaryColor: e.target.value } : prev))}
                  className="omjep-field h-10 w-full cursor-pointer p-1"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="club-secondary-color" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                  Couleur secondaire
                </label>
                <input
                  id="club-secondary-color"
                  type="color"
                  value={editForm?.secondaryColor ?? '#F59E0B'}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, secondaryColor: e.target.value } : prev))}
                  className="omjep-field h-10 w-full cursor-pointer p-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
                Identité visuelle (logo)
              </span>
              <div className="flex flex-wrap items-start gap-3">
                <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-omjep-border bg-omjep-bg-panel-soft transition-colors hover:border-omjep-mauve/40 hover:bg-omjep-mauve/[0.06]">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleManagedLogoUpload}
                    disabled={logoUploading}
                  />
                  {managedLogoPreview ? (
                    <img src={managedLogoPreview} alt="Club logo preview" className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 p-2 text-center text-[11px] text-omjep-text-muted">
                      <ImagePlus className="h-5 w-5 text-omjep-text-muted" />
                      Ajouter
                    </span>
                  )}
                </label>
                <p className="max-w-sm pt-0.5 text-xs text-omjep-text-secondary">
                  PNG, JPG, JPEG, WebP uniquement. Taille max: 2MB.
                  {logoUploading ? ' Upload en cours...' : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="submit"
                variant="gold"
                loading={updateSubmitting}
                disabled={updateSubmitting || !isManagedFormDirty}
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={updateSubmitting || !isManagedFormDirty}
                onClick={handleCancelManagedChanges}
              >
                <RotateCcw className="w-4 h-4" />
                Annuler
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="omjep-surface-card relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-omjep-gold/[0.07] blur-3xl" />
        <div className="relative">
          <DashboardPageHeading
            eyebrow="Club Setup"
            title="Créer mon club"
            subtitle="Renseignez les informations du club pour lancer la validation"
            className="border-b-0 pb-1"
          />
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-omjep-text-secondary">
            Renseignez les informations de votre club Pro Clubs. Après envoi, l&apos;équipe OMJEP
            validera votre demande avant activation sur la plateforme.
          </p>
        </div>
      </header>

      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-omjep-danger/30 bg-omjep-danger/10 px-4 py-3 text-sm text-omjep-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="omjep-surface-card p-5 md:p-6">
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="club-name" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
              Nom du club <span className="text-omjep-danger">*</span>
            </label>
            <input
              id="club-name"
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              maxLength={120}
              required
              placeholder="Ex : Eagles Casablanca"
              className="omjep-field text-sm placeholder:text-omjep-text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="club-desc" className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">
              Description
            </label>
            <textarea
              id="club-desc"
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="Présentez votre club, vos objectifs, votre communauté…"
              className="omjep-field min-h-[5.5rem] resize-y text-sm placeholder:text-omjep-text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-omjep-text-muted">Logo</span>
            <div className="flex flex-wrap items-start gap-3">
              <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-omjep-border bg-omjep-bg-panel-soft transition-colors hover:border-omjep-mauve/40 hover:bg-omjep-mauve/[0.06]">
                <input type="file" accept="image/*" className="sr-only" onChange={onRequestLogoChange} />
                {requestLogoPreview ? (
                  <img src={requestLogoPreview} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 p-2 text-center text-[11px] text-omjep-text-muted">
                    <ImagePlus className="h-5 w-5 text-omjep-text-muted" />
                    Ajouter
                  </span>
                )}
              </label>
              <p className="max-w-sm pt-0.5 text-xs text-omjep-text-secondary">
                PNG, JPG ou WebP — max. {REQUEST_LOGO_MAX_BYTES / 1024} Ko. Le logo sera visible par les
                administrateurs lors de la validation.
              </p>
            </div>
          </div>

          <Button type="submit" variant="gold" loading={requestSubmitting} disabled={requestSubmitting} className="w-full sm:w-auto">
            Envoyer la demande
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-omjep-text-muted">
        Après soumission, un message confirmera que votre club est en attente de validation par
        l&apos;équipe OMJEP.
      </p>
    </div>
  );
}
