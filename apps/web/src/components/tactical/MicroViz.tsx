import { useEffect, useState } from 'react'

/** Micro-visualisations HUD (sparkline + barres segmentées) — palette Obsidienne / Or / Cyan */

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Normalise un tableau de nombres vers 0..1 pour le tracé SVG */
export const normalizeSeries = (values: number[]): number[] => {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values.map((v) => clamp((v - min) / span, 0, 1))
}

type SparklineProps = {
  values: number[]
  className?: string
  stroke?: string
  height?: number
}

export const MicroSparkline = ({
  values,
  className = '',
  stroke = 'rgba(0, 242, 255, 0.7)',
  height = 36,
}: SparklineProps) => {
  const w = 120
  const pad = 2
  const norm = normalizeSeries(values.length ? values : [0])
  if (norm.length < 2) {
    norm.push(norm[0] ?? 0.5)
  }
  const step = (w - pad * 2) / (norm.length - 1)
  const pts = norm.map((y, i) => {
    const x = pad + i * step
    const yy = pad + (1 - y) * (height - pad * 2)
    return `${x.toFixed(1)},${yy.toFixed(1)}`
  })
  const d = `M ${pts.join(' L ')}`

  return (
    <svg
      className={className}
      width={w}
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkGlowHud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,242,255,0.28)" />
          <stop offset="100%" stopColor="rgba(2,2,2,0)" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L ${w - pad} ${height - pad} L ${pad} ${height - pad} Z`}
        fill="url(#sparkGlowHud)"
        opacity={0.5}
      />
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Sparkline simulée — oscillation autonome (greebling) */
export const AutoSparkline = ({ className = '', height = 26 }: { className?: string; height?: number }) => {
  const [values, setValues] = useState<number[]>(() => [42, 48, 44, 52, 50, 58, 54, 61, 57, 63])

  useEffect(() => {
    const id = window.setInterval(() => {
      setValues((prev) => {
        const last = prev[prev.length - 1] ?? 50
        const jitter = (Math.random() - 0.45) * 9
        const next = clamp(last + jitter, 28, 92)
        return [...prev.slice(1), next]
      })
    }, 420)
    return () => window.clearInterval(id)
  }, [])

  return <MicroSparkline values={values} height={height} className={className} stroke="rgba(212, 175, 55, 0.75)" />
}

type SegmentedBarProps = {
  percent: number
  segments?: number
  className?: string
}

export const SegmentedProgressBar = ({
  percent,
  segments = 10,
  className = '',
}: SegmentedBarProps) => {
  const p = clamp(percent, 0, 100)
  const filled = Math.round((p / 100) * segments)
  return (
    <div
      className={`flex gap-0.5 ${className}`.trim()}
      role="img"
      aria-label={`Progression ${Math.round(p)} pour cent`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 rounded-[1px] border border-[#22c55e]/12 transition-colors duration-200 ${
            i < filled
              ? i === segments - 1
                ? 'bg-[#00F2FF] shadow-[0_0_10px_rgba(0,242,255,0.45)]'
                : 'bg-gradient-to-t from-[#020202] via-[#166534] to-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.28)]'
              : 'bg-[#020202]'
          }`}
        />
      ))}
    </div>
  )
}
