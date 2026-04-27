import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type ScrollRevealSectionProps = {
  children: ReactNode
  className?: string
  id?: string
  'aria-label'?: string
} & Omit<HTMLMotionProps<'section'>, 'children'>

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const } },
} as const

/**
 * Apparition scroll : léger slide up + fade (Framer Motion).
 */
export default function ScrollRevealSection({
  children,
  className = '',
  id,
  'aria-label': ariaLabel,
  initial = 'hidden',
  whileInView = 'show',
  viewport = { once: true, amount: 0.12, margin: '0px 0px -8% 0px' },
  ...rest
}: ScrollRevealSectionProps) {
  return (
    <motion.section
      id={id}
      className={className}
      aria-label={ariaLabel}
      variants={reveal}
      initial={initial}
      whileInView={whileInView}
      viewport={viewport}
      {...rest}
    >
      {children}
    </motion.section>
  )
}
