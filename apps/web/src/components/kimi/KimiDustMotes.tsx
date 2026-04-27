import type { CSSProperties } from 'react'

/** Particules 1×1px — slow drift (fond vivant, style Kimi Show) */

const MOTE_COUNT = 42

function hash(n: number) {
  return ((n * 2654435761) >>> 0) / 4294967296
}

export default function KimiDustMotes() {
  return (
    <div className="kimi-dust-field pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {Array.from({ length: MOTE_COUNT }, (_, i) => {
        const x = Math.round((hash(i) * 100 + i * 2.3) % 100)
        const y = Math.round((hash(i + 17) * 100 + i * 3.1) % 100)
        const delay = `${-((i * 1.7) % 28).toFixed(1)}s`
        const duration = `${22 + (i % 18)}s`
        return (
          <span
            key={i}
            className="kimi-dust-mote"
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: delay,
                animationDuration: duration,
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
