import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Component } from 'react';
import {
  User, MapPin, Save, CheckCircle, Shield, Gamepad2,
  Monitor, Cpu,
} from 'lucide-react';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import ContactZone from '@/components/cockpit/ContactZone';

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

interface SettingsForm {
  ea_persona_name: string;
  gamertag_psn: string;
  gamertag_xbox: string;
  preferred_position: string;
  nationality: string;
}

class SettingsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl space-y-6">
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
            <p className="text-red-300 font-medium mb-2">
              Une erreur inattendue est survenue.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-96 rounded bg-white/[0.06]" />
        <div className="h-[1px] bg-white/5 my-6" />
        <div className="space-y-5">
          {[1, 2, 3, 4, 5].map((i) => (
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

function SettingsContent() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [form, setForm] = useState<SettingsForm>({
    ea_persona_name: '',
    gamertag_psn: '',
    gamertag_xbox: '',
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
            gamertag_psn: data.gamertag_psn ?? '',
            gamertag_xbox: data.gamertag_xbox ?? '',
            preferred_position: data.preferred_position ?? '',
            nationality: data.nationality ?? '',
          });
        }
      } catch {
        if (!cancelled) setError('Impossible de charger vos paramètres.');
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

  const update = (field: keyof SettingsForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="max-w-3xl space-y-10">
      {/* Header */}
      <div className="space-y-4">
        <p className="text-[12px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50">
          Control Terminal
        </p>
        <h1 className="font-sans text-4xl font-bold tracking-tight text-black dark:text-white">
          PARAMÈTRES
        </h1>
        <p className="max-w-2xl text-sm text-black/65 dark:text-white/65">
          Chaque réglage est présenté comme une ligne brute, sans surface décorative.
        </p>
      </div>

      {success && (
        <div className="flex animate-in items-center gap-3 border-b border-black/10 py-3 fade-in slide-in-from-top-2 dark:border-white/20">
          <CheckCircle className="h-5 w-5 shrink-0 text-[#22c55e]" />
          <p className="text-sm font-mono text-[#22c55e]">PARAMÈTRES MIS À JOUR</p>
        </div>
      )}

      {error && (
        <div className="border-b border-red-500/40 py-3">
          <p className="text-sm font-mono text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Identifiants de Jeu */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-1">
            <Gamepad2 className="w-4 h-4 text-black/45 dark:text-white/45" />
            <h2 className="text-[12px] font-mono text-black/55 uppercase tracking-widest dark:text-white/55">
              Identifiants de Jeu
            </h2>
          </div>

          {/* Pseudo EA Sports */}
          <div className="space-y-2 rounded-none border border-black/10 bg-black/[0.02] p-4 dark:border-white/20 dark:bg-black/40">
            <label htmlFor="ea_name" className="block text-[12px] font-mono uppercase tracking-widest text-black/55 dark:text-white/55">
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
                className="w-full rounded-none border border-black/10 bg-transparent py-3 pl-11 pr-4 text-sm text-black placeholder:text-black/35 outline-none focus:border-black/40 dark:border-white/20 dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/40"
              />
            </div>
            <p className="text-[12px] font-mono uppercase tracking-widest text-black/45 dark:text-white/45">
              Doit correspondre exactement à votre pseudo en jeu.
            </p>
          </div>

          {/* Gamertag PSN */}
          <div className="space-y-2 rounded-none border border-black/10 bg-black/[0.02] p-4 dark:border-white/20 dark:bg-black/40">
            <label htmlFor="gamertag_psn" className="block text-[12px] font-mono uppercase tracking-widest text-black/55 dark:text-white/55">
              Gamertag PSN
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Monitor className="w-4 h-4 text-slate-500" />
              </div>
              <input
                id="gamertag_psn"
                type="text"
                value={form.gamertag_psn}
                onChange={(e) => update('gamertag_psn', e.target.value)}
                placeholder="Ex: Eagle_PSN"
                className="w-full rounded-none border border-black/10 bg-transparent py-3 pl-11 pr-4 text-sm text-black placeholder:text-black/35 outline-none focus:border-black/40 dark:border-white/20 dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/40"
              />
            </div>
          </div>

          {/* Gamertag Xbox */}
          <div className="space-y-2 rounded-none border border-black/10 bg-black/[0.02] p-4 dark:border-white/20 dark:bg-black/40">
            <label htmlFor="gamertag_xbox" className="block text-[12px] font-mono uppercase tracking-widest text-black/55 dark:text-white/55">
              Gamertag Xbox
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Monitor className="w-4 h-4 text-slate-500" />
              </div>
              <input
                id="gamertag_xbox"
                type="text"
                value={form.gamertag_xbox}
                onChange={(e) => update('gamertag_xbox', e.target.value)}
                placeholder="Ex: Eagle Xbox"
                className="w-full rounded-none border border-black/10 bg-transparent py-3 pl-11 pr-4 text-sm text-black placeholder:text-black/35 outline-none focus:border-black/40 dark:border-white/20 dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/40"
              />
            </div>
          </div>
        </section>

        <div className="h-[1px] bg-white/5" />

        {/* Section: Profil Sportif */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-4 h-4 text-black/45 dark:text-white/45" />
            <h2 className="text-[12px] font-mono text-black/55 uppercase tracking-widest dark:text-white/55">
              Profil Sportif
            </h2>
          </div>

          {/* Position Préférée */}
          <div className="space-y-2 rounded-none border border-black/10 bg-black/[0.02] p-4 dark:border-white/20 dark:bg-black/40">
            <label htmlFor="position" className="block text-[12px] font-mono uppercase tracking-widest text-black/55 dark:text-white/55">
              Position Préférée
            </label>
            <div className="relative">
              <select
                id="position"
                value={form.preferred_position}
                onChange={(e) => update('preferred_position', e.target.value)}
                className="w-full appearance-none rounded-none border border-black/10 bg-transparent py-3 pl-4 pr-10 text-sm text-black outline-none cursor-pointer focus:border-black/40 dark:border-white/20 dark:text-white dark:focus:border-white/40"
              >
                <option value="" className="bg-white text-black dark:bg-black dark:text-white/80">
                  Sélectionnez une position
                </option>
                {POSITIONS.map(({ value, label }) => (
                  <option key={value} value={value} className="bg-white text-black dark:bg-black dark:text-white">
                    {label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="w-4 h-4 text-black/45 dark:text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Nationalité */}
          <div className="space-y-2 rounded-none border border-black/10 bg-black/[0.02] p-4 dark:border-white/20 dark:bg-black/40">
            <label htmlFor="nationality" className="block text-[12px] font-mono uppercase tracking-widest text-black/55 dark:text-white/55">
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
                className="w-full rounded-none border border-black/10 bg-transparent py-3 pl-11 pr-4 text-sm text-black placeholder:text-black/35 outline-none focus:border-black/40 dark:border-white/20 dark:text-white dark:placeholder:text-white/35 dark:focus:border-white/40"
              />
            </div>
          </div>
        </section>

        <div className="h-[1px] bg-white/5" />

        {/* Section: Apparence */}
        <section className="space-y-5">
          <div className="mb-1 flex items-center gap-3">
            <Cpu className="h-4 w-4 text-black/45 dark:text-white/45" />
            <h2 className="text-[12px] font-mono text-black/55 uppercase tracking-widest dark:text-white/55">Apparence</h2>
          </div>
          <div className="rounded-none border border-black/10 bg-black/[0.02] p-4 dark:border-white/20 dark:bg-black/40">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50">
                Mode sombre actif
              </p>
              <div className="flex items-center gap-4">
                <ContactZone
                  variant={theme === 'dark' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="rounded-none"
                >
                  &gt; [ ON ] &lt;
                </ContactZone>
                <ContactZone
                  variant={theme === 'light' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="rounded-none"
                >
                  &gt; [ OFF ] &lt;
                </ContactZone>
              </div>
            </div>
          </div>
          <div className="rounded-none border border-black/10 bg-black/[0.02] p-4 dark:border-white/20 dark:bg-black/40">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50">
                Changer de mode instantanément
              </p>
              <ContactZone type="button" size="sm" variant="ghost" onClick={toggleTheme} className="rounded-none">
                &gt; [ SWITCH ] &lt;
              </ContactZone>
            </div>
          </div>
        </section>

        <div className="h-[1px] bg-white/5" />

        {/* Submit */}
        <ContactZone
          type="submit"
          size="md"
          variant="primary"
          disabled={saving}
          className="rounded-none"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Save className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
          {saving ? 'Enregistrement…' : '> [ SAVE ] <'}
        </ContactZone>
      </form>
    </div>
  );
}

export default function Settings() {
  return (
    <SettingsErrorBoundary>
      <SettingsContent />
    </SettingsErrorBoundary>
  );
}
