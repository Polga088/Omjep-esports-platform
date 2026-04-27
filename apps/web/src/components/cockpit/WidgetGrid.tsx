import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'

type WidgetGridProps = {
  children: ReactNode
  className?: string
  /** Nb de colonnes — default 12 */
  cols?: number
  /** Hauteur min en row */
  rowHeight?: string
  style?: CSSProperties
}

export default function WidgetGrid({
  children,
  className = '',
  cols = 12,
  rowHeight = 'minmax(220px, auto)',
  style,
}: WidgetGridProps) {
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridAutoRows: rowHeight,
    gap: '24px',
    ...style,
  }

  return (
    <motion.div
      className={`widget-grid w-full ${className}`.trim()}
      style={gridStyle}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
      }}
    >
      {children}
    </motion.div>
  )
}
