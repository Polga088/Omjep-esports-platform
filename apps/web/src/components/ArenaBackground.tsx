import { useMemo } from 'react'
import { motion } from 'framer-motion'

type Particle = {
  id: number
  left: string
  top: string
  size: number
  duration: number
  delay: number
  driftX: number
  driftY: number
}

export default function ArenaBackground() {
  const particles = useMemo((): Particle[] => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: `${(Math.sin(i * 2.1) * 0.5 + 0.5) * 92 + 4}%`,
      top: `${(Math.cos(i * 1.7) * 0.5 + 0.5) * 90 + 5}%`,
      size: 1.2 + (i % 5) * 0.7,
      duration: 16 + (i % 8) * 2.2,
      delay: (i % 10) * 0.35,
      driftX: 8 + (i % 6),
      driftY: -20 - (i % 12),
    }))
  }, [])

  return (
    <>
      <div className="omjep-arena-aurora" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[0] overflow-hidden" aria-hidden>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-gradient-to-t from-amber-200/25 to-cyan-200/20 shadow-[0_0_6px_rgba(255,255,255,0.15)]"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, p.driftY, 0],
              x: [0, p.driftX, 0],
              opacity: [0.15, 0.7, 0.2, 0.5, 0.15],
              scale: [1, 1.25, 0.9, 1],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </>
  )
}
