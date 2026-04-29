import { ShieldCheck, Swords } from 'lucide-react'
import type { DashboardContent } from '@/data/dashboard'

interface HeroProps {
  hero: DashboardContent['hero']
}

export default function Hero({ hero }: HeroProps) {
  return (
    <section id="hero" className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-6 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(5,150,105,0.2),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.14),transparent_48%)]" />
      <div className="relative z-10">
        <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
          {hero.badge}
        </span>
        <h1 className="mt-5 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{hero.title}</h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-300/90">{hero.subtitle}</p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">{hero.description}</p>
        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">Cadre officiel</span>
            </div>
            <p className="mt-2 text-sm text-slate-200">Supervision compétitive OMJEP avec standards d’intégrité eSport.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-amber-300">
              <Swords className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">Saison EA FC 26</span>
            </div>
            <p className="mt-2 text-sm text-slate-200">Tournois nationaux, ranking pro, suivi live des performances joueurs.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
