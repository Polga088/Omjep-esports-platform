import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Medal, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type LandingHeroProps = {
  /** Ligne optionnelle sous le sous-titre (ex. stats live) */
  statsLine?: ReactNode;
};

export default function LandingHero({ statsLine }: LandingHeroProps) {
  const { isAuthenticated } = useAuth();
  const authed = isAuthenticated();

  const btnBase =
    'inline-flex items-center justify-center gap-2 rounded-lg border-[0.5px] px-8 py-3.5 text-sm font-semibold transition-all';

  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-[520px] w-[520px] rounded-full bg-indigo-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[380px] w-[380px] rounded-full bg-indigo-600/[0.05] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-widest text-indigo-300/90 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            v0.2.6 · EA FC 26
          </div>

          <h1 className="font-display font-black tracking-tighter text-white">
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="bg-gradient-to-b from-white via-white to-white/55 bg-clip-text text-transparent">
                La plateforme
              </span>
            </span>
            <span className="mt-2 block text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
                n°1 EA FC 26
              </span>
            </span>
            <span className="mt-1 block text-3xl font-bold tracking-tight text-slate-400 sm:text-4xl md:text-5xl">
              au Maroc
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            <span className="font-semibold text-white">OMJEP</span> centralise ligues, mercato, stats et compétitions
            officielles pour les clubs et joueurs EA Sports FC — tout le calendrier, un seul hub.
          </p>

          {statsLine ? <div className="mt-6 text-sm text-slate-500">{statsLine}</div> : null}

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            {authed ? (
              <Link
                to="/dashboard"
                className={`${btnBase} border-indigo-400/30 bg-[#08090c] text-white shadow-[0_0_32px_-8px_rgba(99,102,241,0.5)] hover:border-indigo-400/50 hover:shadow-[0_0_40px_-4px_rgba(99,102,241,0.55)]`}
              >
                <Crown className="h-4 w-4 text-indigo-300" fill="currentColor" />
                Accéder au Dashboard
              </Link>
            ) : (
              <Link
                to="/register"
                className={`${btnBase} border-indigo-400/25 bg-[#08090c] text-white shadow-[0_0_28px_-8px_rgba(99,102,241,0.45)] hover:border-indigo-400/45 hover:shadow-[0_0_36px_-4px_rgba(99,102,241,0.5)]`}
              >
                <Crown className="h-4 w-4 text-indigo-300" fill="currentColor" />
                Créer un compte
              </Link>
            )}
            <Link
              to="/hall-of-fame"
              className={`${btnBase} border-white/10 bg-transparent text-slate-200 hover:border-white/20 hover:shadow-[0_0_24px_-8px_rgba(255,255,255,0.08)]`}
            >
              <Medal className="h-4 w-4 text-indigo-400/80" />
              Palmarès
              <ArrowRight className="h-4 w-4 opacity-60" />
            </Link>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />
    </section>
  );
}
