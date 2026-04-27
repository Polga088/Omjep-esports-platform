import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ParticleCanvas from '@/components/cinematic/ParticleCanvas'
import { useTheme } from '@/context/ThemeContext'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=2000&q=80'

type HeroArenaProps = {
  statsLine?: ReactNode
  reducedMotion: boolean
}

/**
 * Fond type cinéma : image large + Ken Burns, particules WebGL, badge Saison 2026.
 */
export default function HeroArena({ statsLine, reducedMotion }: HeroArenaProps) {
  const { isAuthenticated } = useAuth()
  const { theme } = useTheme()
  const authed = isAuthenticated()
  const btnBase =
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-[#050505]/80 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_32px_-8px_rgba(34,197,94,0.35)] transition-all hover:border-emerald-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50'

  return (
    <section
      className="relative -mx-4 -mt-2 flex min-h-[min(100dvh,900px)] flex-col justify-center overflow-hidden sm:-mx-6 lg:mx-0 lg:rounded-3xl"
      aria-label="Bannière d’accueil"
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className={`absolute inset-0 ${reducedMotion ? 'scale-100' : 'animate-ken-burns-in origin-center'}`}
        >
          <img
            src={HERO_IMAGE}
            alt=""
            className="h-full w-full object-cover opacity-50"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#020202] via-[#020202]/75 to-[#020202]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_20%,rgba(34,197,94,0.18),transparent_50%)]"
          aria-hidden
        />
        <ParticleCanvas className="z-[1] opacity-90" reducedMotion={reducedMotion} theme={theme} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-widest text-emerald-200 backdrop-blur-md"
          role="status"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.9)]"
            style={{ animation: reducedMotion ? undefined : 'pulse 1.6s ease-in-out infinite' }}
            aria-hidden
          />
          <span className="font-heading font-bold">Saison 2026</span>
          <span className="hidden text-emerald-400/80 sm:inline">·</span>
          <span className="hidden sm:inline">EA FC · Fédération Maroc</span>
        </div>

        <h1 className="font-heading text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="block bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Compétition
          </span>
          <span className="mt-1 block text-emerald-400">cinematic</span>
          <span className="mt-1 block text-2xl font-bold text-slate-400 sm:text-3xl md:text-4xl">
            L’expérience OMJEP repensée
          </span>
        </h1>

        <p className="mt-7 max-w-2xl font-sans text-base leading-relaxed text-slate-300 sm:text-lg">
          <span className="font-semibold text-white">Pixar-sport :</span> clarté, émotion, stats. Une
          interface profonde, une accentuation émeraude, et l’esprit compétitif du football virtuel
          marocain.
        </p>

        {statsLine ? <div className="mt-5 font-sans text-sm text-slate-500">{statsLine}</div> : null}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          {authed ? (
            <Link to="/dashboard" className={btnBase}>
              <Crown className="h-4 w-4 text-emerald-400" fill="currentColor" aria-hidden />
              Accéder au dashboard
            </Link>
          ) : (
            <Link to="/register" className={btnBase}>
              <Crown className="h-4 w-4 text-emerald-400" fill="currentColor" aria-hidden />
              Créer un compte
            </Link>
          )}
          <Link
            to="/community"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden />
            Actualités
          </Link>
        </div>
      </div>
    </section>
  )
}
