import type { ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'

const widgetVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } },
}

export type WidgetTileProps = {
  serial?: string
  title: string
  subtitle?: string
  children: ReactNode
  controls?: ReactNode
  className?: string
  bodyClassName?: string
  /** Largeur en colonnes de la grille principale (default 4) */
  span?: number
  /** Hauteur en lignes de la grille principale (default 1) */
  rowSpan?: number
  /** Tile mise en focus (player/center) */
  focus?: boolean
  /** ID pour layout magnétique entre routes */
  layoutId?: string
}

const focusBorder = 'shadow-none'
const restingBorder = 'shadow-none'

export default function WidgetTile({
  title,
  subtitle,
  children,
  controls,
  className = '',
  bodyClassName = '',
  span = 4,
  rowSpan = 1,
  focus = false,
  layoutId,
}: WidgetTileProps) {
  const reduce = useReducedMotion()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridStyle = {
    gridColumn: `span ${span} / span ${span}`,
    gridRow: `span ${rowSpan} / span ${rowSpan}`,
  }

  return (
    <motion.section
      style={gridStyle}
      className={`widget-tile group relative isolate flex min-h-0 flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-none ${
        isDark ? 'border-white/20 bg-black/40 text-white' : 'border-black/10 bg-black/[0.02] text-black'
      } ${focus ? focusBorder : restingBorder} ${className}`.trim()}
      variants={widgetVariants}
      initial={reduce ? false : 'hidden'}
      animate="show"
      layout
      layoutId={layoutId}
      aria-label={title}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.85 }}
    >
      <header className="widget-tile__bar relative z-10 flex shrink-0 items-start justify-between gap-3 border-b border-inherit px-8 pt-8 pb-4">
        <div className="min-w-0 flex-1">
          <p className={`font-sans text-[12px] font-semibold uppercase tracking-widest ${isDark ? 'text-white/70' : 'text-black/65'}`}>
            {title}
          </p>
          {subtitle ? <p className={`mt-2 truncate text-[11px] ${isDark ? 'text-white/35' : 'text-black/35'}`}>{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">{controls ?? null}</div>
      </header>
      <div className={`widget-tile__body relative z-10 flex min-h-0 flex-1 flex-col border-l-2 border-inherit p-8 ${bodyClassName}`.trim()}>
        {children}
      </div>
    </motion.section>
  )
}
