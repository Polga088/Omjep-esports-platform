import { motion, useReducedMotion } from 'framer-motion'
import { Award, Flame, Star, Zap } from 'lucide-react'

const PORTRAIT =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'

const BADGES = [
  { icon: Flame, label: 'Capitaine', sub: '12 victoires', delay: 0, x: '12%', y: '8%' },
  { icon: Star, label: 'Étoile', sub: 'MVP semaine 4', delay: 0.08, x: '78%', y: '14%' },
  { icon: Zap, label: 'Serial', sub: '5 buts en 2 matchs', delay: 0.16, x: '6%', y: '62%' },
  { icon: Award, label: 'Héros', sub: 'Finale Ligue 1', delay: 0.24, x: '82%', y: '58%' },
]

const float = (i: number) => ({
  y: [0, -5, 0],
  transition: { duration: 3.2 + i * 0.2, repeat: Infinity, ease: 'easeInOut' as const },
})

/**
 * Mise en avant MVP — portrait + badges flottants (démo narrative).
 */
export default function MVPSpotlight() {
  const reduce = useReducedMotion()

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505]/70 p-4 backdrop-blur-xl sm:p-8">
      <div className="mb-2 flex flex-col gap-1 sm:mb-4">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-emerald-400/90">
          MVP Spotlight
        </p>
        <h2 className="font-heading text-2xl font-black text-white sm:text-3xl">Alex &quot;Viper&quot; Moreau</h2>
        <p className="font-sans text-sm text-slate-400">Attaquant · Eagles Casablanca · look ciné 3D</p>
      </div>

      <div className="relative mx-auto max-w-md">
        <motion.div
          className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_0_60px_-12px_rgba(34,197,94,0.35)]"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={PORTRAIT}
            alt="Portrait d’Alex Viper Moreau, joueur e-sport"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent"
            aria-hidden
          />
          {BADGES.map((b, i) => {
            const Icon = b.icon
            return (
              <motion.div
                key={b.label}
                className="absolute z-10 w-[min(44%,8rem)] rounded-xl border border-white/12 bg-[#020202]/80 px-2 py-1.5 shadow-lg backdrop-blur-md sm:px-3 sm:py-2"
                style={{ left: b.x, top: b.y }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: b.delay, type: 'spring', stiffness: 200, damping: 18 }}
                animate={reduce ? undefined : float(i)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-white sm:text-xs">{b.label}</p>
                    <p className="truncate text-[9px] text-slate-500 sm:text-[10px]">{b.sub}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
