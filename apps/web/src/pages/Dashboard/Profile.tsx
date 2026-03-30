import { useEffect, useState, type FormEvent } from 'react';
import { User, MapPin, Save, CheckCircle, Shield, Gamepad2 } from 'lucide-react';
import api from '@/lib/api';

const POSITIONS = [
  { value: 'GK', label: 'GK — Gardien' },
  { value: 'DC', label: 'DC — Défenseur Central' },
  { value: 'LAT', label: 'LAT — Latéral Gauche' },
  { value: 'RAT', label: 'RAT — Latéral Droit' },
  { value: 'MDC', label: 'MDC — Milieu Défensif' },
  { value: 'MOC', label: 'MOC — Milieu Offensif' },
  { value: 'MG', label: 'MG — Milieu Gauche' },
  { value: 'MD', label: 'MD — Milieu Droit' },
  { value: 'BU', label: 'BU — Buteur' },
  { value: 'ATT', label: 'ATT — Attaquant' },
] as const;

interface ProfileForm {
  ea_persona_name: string;
  preferred_position: string;
  nationality: string;
}

export default function Profile() {
  const [form, setForm] = useState<ProfileForm>({
    ea_persona_name: '',
    preferred_position: '',
    nationality: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled) {
          setForm({
            ea_persona_name: data.ea_persona_name ?? '',
            preferred_position: data.preferred_position ?? '',
            nationality: data.nationality ?? '',
          });
        }
      } catch {
        if (!cancelled) setError('Impossible de charger votre profil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.patch('/users/profile', form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError('Une erreur est survenue lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-white/[0.06]" />
          <div className="h-4 w-96 rounded bg-white/[0.06]" />
          <div className="h-[1px] bg-white/5 my-6" />
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 rounded bg-white/[0.06]" />
                <div className="h-12 rounded-xl bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="relative rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
        <div className="relative">
          <h1 className="font-display font-bold text-2xl text-white mb-2">
            Paramètres du Profil
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
            Votre <span className="text-indigo-400 font-semibold">Pseudo EA Sports</span> est
            utilisé pour récupérer automatiquement vos statistiques de match.
            Assurez-vous qu'il corresponde exactement à votre gamertag.
          </p>
        </div>
      </div>

      {/* Success toast */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm font-medium">
            Profil mis à jour avec succès !
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Informations de Jeu */}
        <section className="space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Informations de Jeu
            </h2>
          </div>

          {/* Pseudo EA Sports */}
          <div className="space-y-2">
            <label htmlFor="ea_name" className="block text-sm font-medium text-slate-300">
              Pseudo EA Sports
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <input
                id="ea_name"
                type="text"
                value={form.ea_persona_name}
                onChange={(e) => update('ea_persona_name', e.target.value)}
                placeholder="Ex: xEagle_Sniper"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-white/20"
              />
            </div>
            <p className="text-xs text-slate-600">
              Doit correspondre exactement à votre pseudo en jeu.
            </p>
          </div>

          {/* Position Préférée */}
          <div className="space-y-2">
            <label htmlFor="position" className="block text-sm font-medium text-slate-300">
              Position Préférée
            </label>
            <div className="relative">
              <select
                id="position"
                value={form.preferred_position}
                onChange={(e) => update('preferred_position', e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-4 pr-10 text-sm text-white outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-white/20 cursor-pointer"
              >
                <option value="" className="bg-[#0D1221] text-slate-400">
                  Sélectionnez une position
                </option>
                {POSITIONS.map(({ value, label }) => (
                  <option key={value} value={value} className="bg-[#0D1221] text-white">
                    {label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <div className="h-[1px] bg-white/5" />

        {/* Section: Identité */}
        <section className="space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#FF6B35]" />
            </div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Identité
            </h2>
          </div>

          {/* Nationalité */}
          <div className="space-y-2">
            <label htmlFor="nationality" className="block text-sm font-medium text-slate-300">
              Nationalité
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
              <input
                id="nationality"
                type="text"
                value={form.nationality}
                onChange={(e) => update('nationality', e.target.value)}
                placeholder="Ex: Marocain"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-white/20"
              />
            </div>
          </div>
        </section>

        <div className="h-[1px] bg-white/5" />

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Save className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
          {saving ? 'Enregistrement…' : 'Sauvegarder les modifications'}
        </button>
      </form>
    </div>
  );
}
