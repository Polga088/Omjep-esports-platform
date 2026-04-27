import { type ComponentType, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import TacticalHudFrame from '@/components/TacticalHudFrame'

export type IconTone = 'gold' | 'neutral'

const labelToneClass: Record<IconTone, string> = {
  gold: 'text-omjep-gold/85',
  neutral: 'text-omjep-neutral/90',
}

const labelVariantClass = {
  default: '',
  danger: 'text-omjep-danger/95',
} as const

const iconToneClass: Record<IconTone, string> = {
  gold: 'text-omjep-gold/55 [stroke-width:1.7]',
  neutral: 'text-omjep-neutral/55 [stroke-width:1.7]',
}

/**
 * Même coque visuelle que les cartes stats Bento du dashboard joueur
 * (tactical-bento, HUD frame, min-h-[8.5rem], hiérarchie label / valeur / hint).
 */
export default function TacticalBentoStatLinkCard({
  to,
  label,
  value,
  hint,
  icon: Icon,
  hudTopLeft,
  hudBottomRight,
  iconTone = 'gold',
  labelVariant = 'default',
  linkProps,
}: {
  to: string
  label: string
  value: number | string
  hint: string
  icon: ComponentType<{ className?: string }>
  hudTopLeft: string
  hudBottomRight: string
  iconTone?: IconTone
  /** Litiges / alertes : étiquette en rouge cyber */
  labelVariant?: keyof typeof labelVariantClass
  linkProps?: Omit<LinkProps, 'to' | 'className' | 'children'>
}) {
  const labelClass =
    labelVariant === 'danger'
      ? labelVariantClass.danger
      : labelToneClass[iconTone]

  return (
    <Link
      to={to}
      {...linkProps}
      className="group tactical-bento relative flex min-h-[8.5rem] flex-col items-start justify-between p-5 transition-all hover:bg-white/[0.04]"
    >
      <TacticalHudFrame topLeftCode={hudTopLeft} bottomRightCode={hudBottomRight} />
      <div className="relative z-[1] flex w-full items-start justify-between gap-2">
        <span className={`min-w-0 text-[10px] font-bold uppercase tracking-[0.2em] ${labelClass}`}>
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Icon className={`h-4 w-4 transition-colors ${iconToneClass[iconTone]}`} />
          <ArrowRight className="h-3.5 w-3.5 text-omjep-neutral/50 transition-colors group-hover:text-omjep-gold/80" />
        </div>
      </div>
      <div className="relative z-[1] mt-3 w-full min-w-0">
        <p className="font-tech text-3xl font-bold tabular-nums tracking-tighter text-white">
          {value}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-omjep-neutral">{hint}</p>
      </div>
    </Link>
  )
}

/** Variante non-lien (statique) pour réutilisation sans navigation */
export function TacticalBentoStatBlock({
  label,
  value,
  sublabel,
  icon: Icon,
  hudTopLeft,
  hudBottomRight,
  iconTone = 'gold',
  valueNode,
  className = '',
  children,
}: {
  label: string
  value?: number | string
  sublabel?: string
  icon: ComponentType<{ className?: string }>
  hudTopLeft: string
  hudBottomRight: string
  iconTone?: IconTone
  valueNode?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={`tactical-bento relative flex min-h-[8.5rem] flex-col items-start justify-between p-5 ${className}`}
    >
      <TacticalHudFrame topLeftCode={hudTopLeft} bottomRightCode={hudBottomRight} />
      <div className="relative z-[1] flex w-full items-start justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${labelToneClass[iconTone]}`}>
          {label}
        </span>
        <Icon className={`h-4 w-4 shrink-0 ${iconToneClass[iconTone]}`} />
      </div>
      <div className="relative z-[1] mt-3 w-full min-w-0">
        {valueNode ?? (
          <span className="font-tech text-3xl font-bold tabular-nums tracking-tighter text-white">
            {value}
          </span>
        )}
        {sublabel ? (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-omjep-neutral/80">
            {sublabel}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  )
}
