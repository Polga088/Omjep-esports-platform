type MatchScoreProjectionProps = {
  home: number
  away: number
  /** Affichage imposant (carte match) vs modale */
  size?: 'modal' | 'hero' | 'card'
  className?: string
  'aria-label'?: string
}

const sizeClass: Record<NonNullable<MatchScoreProjectionProps['size']>, string> = {
  card: 'text-2xl sm:text-3xl',
  modal: 'text-3xl sm:text-4xl',
  hero: 'text-4xl sm:text-5xl',
}

/**
 * Score match style projection : `> [ dom ] - [ ext ] <`
 */
export function MatchScoreProjection({
  home,
  away,
  size = 'card',
  className = '',
  'aria-label': ariaLabel,
}: MatchScoreProjectionProps) {
  const sc = sizeClass[size]
  const label = ariaLabel ?? `Score ${home} à ${away}`

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-1 gap-y-0 font-mono tabular-nums ${sc} ${className}`.trim()}
      aria-label={label}
    >
      <span className="select-none text-[0.45em] font-bold text-[#22c55e]/55" aria-hidden>
        &gt;
      </span>
      <span className="select-none text-[0.45em] font-bold text-[#22c55e]/45" aria-hidden>
        [
      </span>
      <span className="min-w-[1ch] px-0.5 font-black text-white omjep-metric-crt">{home}</span>
      <span className="select-none text-[0.45em] font-bold text-[#22c55e]/45" aria-hidden>
        ]
      </span>
      <span className="select-none px-0.5 text-[0.55em] font-bold text-[#22c55e]/35" aria-hidden>
        -
      </span>
      <span className="select-none text-[0.45em] font-bold text-[#22c55e]/45" aria-hidden>
        [
      </span>
      <span className="min-w-[1ch] px-0.5 font-black text-white omjep-metric-crt">{away}</span>
      <span className="select-none text-[0.45em] font-bold text-[#22c55e]/45" aria-hidden>
        ]
      </span>
      <span className="select-none text-[0.45em] font-bold text-[#22c55e]/55" aria-hidden>
        &lt;
      </span>
    </span>
  )
}
