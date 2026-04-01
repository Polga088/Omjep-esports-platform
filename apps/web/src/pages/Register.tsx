import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Mail, Lock, Eye, EyeOff, User, Gamepad2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type Role = 'PLAYER' | 'MANAGER';

interface FormState {
  email: string;
  ea_persona_name: string;
  password: string;
  role: Role;
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [form, setForm] = useState<FormState>({
    email: '',
    ea_persona_name: '',
    password: '',
    role: 'PLAYER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/auth/register', form);
      setSuccess(true);

      if (data.access_token) {
        login(data.user, data.access_token);
        // Redirection vers l'onboarding pour compléter le profil
        setTimeout(() => navigate('/onboarding'), 800);
      } else {
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        'Une erreur est survenue lors de l\'inscription.';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  const roles: { value: Role; label: string; description: string }[] = [
    { value: 'PLAYER', label: 'Joueur', description: 'Rejoins un club et compétitionne' },
    { value: 'MANAGER', label: 'Manager', description: 'Crée et gère ton propre club' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full bg-[#FF6B35]/3 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-amber-400/3 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#0D1221] shadow-2xl shadow-black/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#CC4400] shadow-lg shadow-[#FF6B35]/25 mb-4">
              <Gamepad2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white mb-1">Créer un compte</h1>
            <p className="text-slate-500 text-sm">Rejoins la compétition OMJEP</p>
          </div>

          {/* Success */}
          {success && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-6">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Compte créé avec succès ! Redirection en cours…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition-all"
                />
              </div>
            </div>

            {/* EA Persona Name */}
            <div>
              <label htmlFor="ea_persona_name" className="block text-sm font-medium text-slate-300 mb-2">
                EA Persona Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="ea_persona_name"
                  name="ea_persona_name"
                  type="text"
                  required
                  value={form.ea_persona_name}
                  onChange={handleChange}
                  placeholder="VotreNomEA"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition-all"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1.5">Votre pseudo EA FC (doit correspondre exactement)</p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 caractères"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Rôle</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map(({ value, label, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: value }))}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      form.role === value
                        ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <p className="text-sm font-semibold">{label}</p>
                    <p className={`text-xs mt-0.5 ${form.role === value ? 'text-amber-400/70' : 'text-slate-600'}`}>
                      {description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-amber-400 text-[#0A0E1A] hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 mt-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-[#0A0E1A]/30 border-t-[#0A0E1A] rounded-full animate-spin" />
              ) : (
                <Crown className="w-4 h-4" fill="currentColor" />
              )}
              {isLoading ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
