import { useEffect, useId, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'

const STATS = [
  { label: 'Buts / match', value: '1.12' },
  { label: 'Passes décisives', value: '84' },
  { label: 'Tacles réussis', value: '62 %' },
  { label: 'Présence', value: '98 %' },
]

type WinrateRingProps = { percent: number; size?: number }

/**
 * Cercle de winrate animé (SVG) — fiche type FIFA.
 */
function WinrateRing({ percent, size = 160 }: WinrateRingProps) {
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gradId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapRef, { once: true, amount: 0.45 })
  const [p, setP] = useState(0)
  const target = useMotionValue(0)
  const spring = useSpring(target, { stiffness: 50, damping: 22, mass: 0.4 })

  useEffect(() => {
    if (inView) target.set(percent)
  }, [inView, percent, target])

  useMotionValueEvent(spring, 'change', (v) => {
    setP(v)
  })
  const offset = c * (1 - p / 100)

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center">
      <svg
        width={size}
        height={size}
        className="rotate-[-90deg] drop-shadow-[0_0_24px_rgba(34,197,94,0.25)]"
        role="img"
        aria-label={`Taux de victoire ${Math.round(p)} pour cent`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-3xl font-black text-white">{Math.round(p)}%</span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Winrate</span>
      </div>
    </div>
  )
}

/**
 * Fiche profil : ring winrate + grille stats (démo).
 */
export default function ProfileSection() {
  return (
    <div className="grid grid-cols-1 gap-8 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 backdrop-blur-xl sm:grid-cols-2 sm:p-8">
      <div className="flex flex-col items-center justify-center gap-4 text-center sm:items-center">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-emerald-400/90">
          Saison 2026
        </p>
        <h3 className="font-heading text-2xl font-bold text-white sm:text-3xl">Carte pro — démo</h3>
        <WinrateRing percent={68} />
        <p className="max-w-xs font-sans text-sm text-slate-400">
          Progression type « fiche joueur » : le cercle s’anime à l’entrée dans le viewport.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STATS.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.35 }}
            className="rounded-xl border border-white/10 bg-[#020202]/50 p-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{s.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-white">{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
