import type { ReactNode } from 'react'

type TechnicalDataValueProps = {
  children: ReactNode
  accent?: 'gold' | 'cyan'
  className?: string
  /** Chevron / crochets plus petits que le chiffre */
  symbolScale?: 'sm' | 'md' | 'lg'
  'aria-label'?: string
}

const accentChev: Record<NonNullable<TechnicalDataValueProps['accent']>, string> = {
  gold: 'text-[#22c55e]/55',
  cyan: 'text-[#00F2FF]/50',
}

const symbolScaleClass: Record<NonNullable<TechnicalDataValueProps['symbolScale']>, string> = {
  sm: 'text-[0.55em] leading-none',
  md: 'text-[0.65em] leading-none',
  lg: 'text-[0.72em] leading-none',
}

/**
 * Projection de donnée style Kimi / neo-gaming : `> [ valeur ] <`
 */
export function TechnicalDataValue({
  children,
  accent = 'gold',
  className = '',
  symbolScale = 'md',
  'aria-label': ariaLabel,
}: TechnicalDataValueProps) {
  const ch = accentChev[accent]
  const sc = symbolScaleClass[symbolScale]

  return (
    <span
      className={`inline-flex max-w-full items-baseline gap-px font-mono tabular-nums tracking-tight ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <span className={`shrink-0 font-bold select-none ${ch} ${sc}`} aria-hidden>
        &gt;
      </span>
      <span className={`shrink-0 font-bold select-none ${ch} ${sc} opacity-70`} aria-hidden>
        [
      </span>
      <span className="min-w-0 px-0.5 font-bold leading-none tracking-tight">{children}</span>
      <span className={`shrink-0 font-bold select-none ${ch} ${sc} opacity-70`} aria-hidden>
        ]
      </span>
      <span className={`shrink-0 font-bold select-none ${ch} ${sc}`} aria-hidden>
        &lt;
      </span>
    </span>
  )
}
