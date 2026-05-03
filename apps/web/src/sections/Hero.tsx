import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Sparkles, Swords, Trophy } from 'lucide-react'
import type { DashboardContent } from '@/data/dashboard'

interface HeroProps {
  hero: DashboardContent['hero']
}

export default function Hero({ hero }: HeroProps) {
  return (
    <section
      id="hero"
      className="relative overflow-hidden rounded-2xl border border-omjep-border/80 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_96%,var(--omjep-bg-elevated))] p-6 shadow-[var(--omjep-shadow-lg)] ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_60%,transparent)] backdrop-blur-md sm:rounded-3xl sm:p-8 lg:p-10 dark:border-[color-mix(in_srgb,var(--omjep-border-gold)_22%,var(--omjep-border))] dark:bg-[color-mix(in_srgb,var(--omjep-bg-panel)_88%,#06040c)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-100"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--omjep-mauve) 18%, transparent) 0%, transparent 42%),
            radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--omjep-gold) 12%, transparent) 0%, transparent 46%)
          `,
        }}
      />
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel-soft))] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-primary">
          <Sparkles className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-mauve))]" aria-hidden />
          {hero.badge}
        </span>
        <h1 className="mt-5 max-w-4xl font-heading text-3xl font-black leading-[1.08] tracking-tight text-omjep-text-primary sm:text-4xl lg:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--omjep-accent-gold)_88%,var(--omjep-text-secondary))] sm:text-base">
          {hero.subtitle}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-omjep-text-secondary sm:text-base">
          {hero.description}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            to="/register"
            className="omjep-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-3 text-sm font-semibold normal-case tracking-normal"
          >
            <Trophy className="h-4 w-4 shrink-0" aria-hidden />
            Rejoindre la saison Pro Clubs
            <ArrowRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </Link>
          <Link
            to="/community"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-omjep-border/80 bg-omjep-bg-panel-soft/90 px-6 py-3 text-sm font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_6%,var(--omjep-bg-panel-soft))]"
          >
            Actualités & communauté
          </Link>
          <Link
            to="/hall-of-fame"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-semibold text-omjep-text-secondary underline-offset-4 transition hover:text-omjep-text-primary hover:underline"
          >
            Palmarès officiel
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 p-4 backdrop-blur-sm sm:p-5">
            <div className="flex items-center gap-2 text-omjep-mauve">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-secondary">
                Cadre compétition
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-omjep-text-secondary">
              Homologation des résultats, intégrité des stats et visibilité club / joueur alignées sur la saison EA FC.
            </p>
          </div>
          <div className="rounded-2xl border border-omjep-border/70 bg-omjep-bg-panel-soft/90 p-4 backdrop-blur-sm sm:p-5">
            <div className="flex items-center gap-2 text-[color-mix(in_srgb,var(--omjep-accent-gold)_90%,var(--omjep-mauve))]">
              <Swords className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-secondary">
                Pro Clubs Maroc
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-omjep-text-secondary">
              Classements nationaux, agenda matchs et fiches joueurs — le même référentiel pour staff et compétiteurs.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
