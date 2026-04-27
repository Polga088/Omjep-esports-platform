import { useMemo } from 'react'

type Props = {
  className?: string
  topLeftCode?: string
  bottomRightCode?: string
}

const randSeed = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export default function TacticalHudFrame({
  className = '',
  topLeftCode = 'AUX-OMJ',
  bottomRightCode = 'UPLINK',
}: Props) {
  const { c1, c2, p } = useMemo(() => {
    const seed = randSeed(topLeftCode)
    return {
      c1: 12 + (seed % 18),
      c2: 30 + (seed % 50),
      p: 60 + (seed % 40),
    }
  }, [topLeftCode])

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[2] overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="absolute left-2 top-2 flex items-start gap-2 opacity-50">
        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 border-l border-t border-cyan-400/40" />
        <div className="flex flex-col">
          <span className="font-mono text-[8px] font-semibold tabular-nums tracking-tight text-cyan-400/80">
            [{topLeftCode}]
          </span>
          <span className="mt-0.5 font-mono text-[7px] tabular-nums text-slate-500">
            {`${c1}°${String(c2).padStart(2, '0')}'N // ELV +${p}`}
          </span>
        </div>
      </div>
      <div className="absolute right-2 top-2 h-3 w-3 border-t border-r border-amber-400/25" />
      <div className="absolute left-2 bottom-2 h-3 w-3 border-b border-l border-amber-400/25" />

      <div className="absolute bottom-2 right-2 flex max-w-[min(8rem,40%)] flex-col items-end gap-1 opacity-55">
        <div className="h-0.5 w-16 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full w-[65%] rounded-full bg-gradient-to-r from-amber-500/30 via-cyan-400/50 to-amber-500/30"
            style={{ width: `${40 + (c1 % 45)}%` }}
          />
        </div>
        <span className="font-mono text-[7px] uppercase tracking-widest text-amber-500/50">
          {bottomRightCode} · {c1}Hz
        </span>
      </div>
    </div>
  )
}
