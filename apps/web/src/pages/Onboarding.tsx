import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown, ChevronRight, ChevronLeft, Check, Coins,
  Globe, Gamepad2, MapPin, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type Position = 'GK' | 'DC' | 'LAT' | 'RAT' | 'MDC' | 'MOC' | 'MG' | 'MD' | 'BU' | 'ATT';

interface PositionInfo {
  value: Position;
  label: string;
  abbr: string;
  color: string;
  description: string;
}

const POSITIONS: PositionInfo[] = [
  { value: 'GK',  label: 'Gardien',           abbr: 'GK',  color: 'amber',  description: 'Dernier rempart' },
  { value: 'DC',  label: 'Défenseur central', abbr: 'DC',  color: 'sky',    description: 'Cœur de la défense' },
  { value: 'LAT', label: 'Latéral gauche',    abbr: 'LAT', color: 'sky',    description: 'Flanc gauche' },
  { value: 'RAT', label: 'Latéral droit',     abbr: 'RAT', color: 'sky',    description: 'Flanc droit' },
  { value: 'MDC', label: 'Milieu défensif',   abbr: 'MDC', color: 'emerald','description': 'Bouclier du milieu' },
  { value: 'MOC', label: 'Milieu offensif',   abbr: 'MOC', color: 'emerald','description': 'Créateur de jeu' },
  { value: 'MG',  label: 'Milieu gauche',     abbr: 'MG',  color: 'emerald','description': 'Aile gauche' },
  { value: 'MD',  label: 'Milieu droit',      abbr: 'MD',  color: 'emerald','description': 'Aile droite' },
  { value: 'BU',  label: 'Avant-centre',      abbr: 'BU',  color: 'red',    description: 'Buteur' },
  { value: 'ATT', label: 'Attaquant',         abbr: 'ATT', color: 'red',    description: 'Finisseur' },
];

const NATIONALITIES = [
  'Maroc', 'Algérie', 'Tunisie', 'Égypte', 'Sénégal', 'Côte d\'Ivoire',
  'Nigeria', 'Ghana', 'France', 'Espagne', 'Portugal', 'Belgique',
  'Italie', 'Allemagne', 'Angleterre', 'Brésil', 'Argentine', 'Autre',
];

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  amber:   { bg: 'bg-amber-400/15',   border: 'border-amber-400/40',   text: 'text-amber-400' },
  sky:     { bg: 'bg-sky-400/15',     border: 'border-sky-400/40',     text: 'text-sky-400' },
  emerald: { bg: 'bg-emerald-400/15', border: 'border-emerald-400/40', text: 'text-emerald-400' },
  red:     { bg: 'bg-red-400/15',     border: 'border-red-400/40',     text: 'text-red-400' },
};

const STEPS = ['Poste', 'Nationalité', 'Confirmation'] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const { patchUser } = useAuthStore();

  const [step, setStep] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const [nationality, setNationality] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canProceed = [
    position !== null,
    nationality !== '',
    true,
  ][step];

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.patch('/auth/onboarding', {
        preferred_position: position,
        nationality,
        gamertag_psn: gamertag || undefined,
      });
      patchUser({
        preferred_position: data.user?.preferred_position,
        nationality: data.user?.nationality,
        omjepCoins: data.user?.omjepCoins,
      });
      toast.success('Profil complété ! 500 OMJEP Coins reçus 🎉');
      navigate('/dashboard');
    } catch {
      toast.error('Erreur lors de la complétion du profil.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-amber-400/4 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-orange-500/3 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-400/30 mb-5">
            <Crown className="w-8 h-8 text-[#0A0E1A]" fill="currentColor" />
          </div>
          <h1 className="font-display font-black text-3xl text-white mb-2">Bienvenue sur OMJEP !</h1>
          <p className="text-slate-400">Complète ton profil pour commencer l'aventure</p>
        </div>

        {/* Welcome coins badge */}
        <div className="flex items-center justify-center gap-2 mb-8 px-5 py-3 rounded-xl border border-amber-400/20 bg-amber-400/8 w-fit mx-auto">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-bold text-sm">
            500 OMJEP Coins offerts à la complétion !
          </span>
          <Star className="w-4 h-4 text-amber-400/60" fill="currentColor" />
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${i <= step ? 'text-amber-400' : 'text-slate-600'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? 'bg-amber-400 text-[#0A0E1A]'
                    : i === step
                    ? 'bg-amber-400/20 border border-amber-400/50 text-amber-400'
                    : 'bg-white/5 border border-white/10 text-slate-500'
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < step ? 'bg-amber-400/40' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0D1221] shadow-2xl shadow-black/50 p-8">

          {/* Step 0: Position */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-5 h-5 text-amber-400" />
                <h2 className="font-display font-bold text-xl text-white">Ton poste préféré</h2>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                Quel est ton poste naturel sur EA FC ?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {POSITIONS.map((pos) => {
                  const cls = COLOR_CLASSES[pos.color];
                  const selected = position === pos.value;
                  return (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => setPosition(pos.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? `${cls.bg} ${cls.border}`
                          : 'border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <p className={`text-lg font-black ${selected ? cls.text : 'text-white'}`}>
                        {pos.abbr}
                      </p>
                      <p className={`text-[10px] leading-tight mt-0.5 ${selected ? cls.text + '/70' : 'text-slate-500'}`}>
                        {pos.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              {position && (
                <div className="mt-4 p-3 rounded-xl bg-amber-400/8 border border-amber-400/20 flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-300 font-medium">
                    {POSITIONS.find((p) => p.value === position)?.label} sélectionné
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Nationality */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h2 className="font-display font-bold text-xl text-white">Ta nationalité</h2>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                Représente ton pays sur la plateforme
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {NATIONALITIES.map((nat) => (
                  <button
                    key={nat}
                    type="button"
                    onClick={() => setNationality(nat)}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-all ${
                      nationality === nat
                        ? 'border-amber-400/40 bg-amber-400/15 text-amber-400'
                        : 'border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {nat}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1.5 text-slate-500" />
                  Autre nationalité (saisie libre)
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Ex: Mauritanie, Libye..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition-all"
                />
              </div>
            </div>
          )}

          {/* Step 2: Summary + Gamertag */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-400" />
                <h2 className="font-display font-bold text-xl text-white">Récapitulatif</h2>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                Vérifie et complète ton profil avant de commencer
              </p>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Poste</p>
                  <p className="font-bold text-white text-lg">{position ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {POSITIONS.find((p) => p.value === position)?.label}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Nationalité</p>
                  <p className="font-bold text-white">{nationality || '—'}</p>
                </div>
              </div>

              {/* Optional gamertag */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Gamepad2 className="w-4 h-4 inline mr-1.5 text-slate-500" />
                  Gamertag PSN <span className="text-slate-600 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={gamertag}
                  onChange={(e) => setGamertag(e.target.value)}
                  placeholder="Ton ID PlayStation Network"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition-all"
                />
              </div>

              {/* Welcome reward box */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-400/10 to-orange-500/10 border border-amber-400/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white">🎉 Récompense de bienvenue</p>
                    <p className="text-sm text-amber-400/80">
                      <span className="font-black text-amber-400 text-lg">500 OMJEP Coins</span> seront ajoutés à ton compte
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={() => step > 0 ? setStep(s => s - 1) : undefined}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => canProceed && setStep(s => s + 1)}
                disabled={!canProceed}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-400 text-[#0A0E1A] hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-400/20"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-[#0A0E1A] hover:from-amber-300 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-400/25"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#0A0E1A]/30 border-t-[#0A0E1A] rounded-full animate-spin" />
                ) : (
                  <Crown className="w-4 h-4" fill="currentColor" />
                )}
                {isLoading ? 'Finalisation...' : 'Commencer l\'aventure !'}
              </button>
            )}
          </div>
        </div>

        {/* Skip link */}
        <p className="text-center text-slate-600 text-xs mt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="hover:text-slate-400 transition-colors"
          >
            Passer cette étape →
          </button>
        </p>
      </div>
    </div>
  );
}
