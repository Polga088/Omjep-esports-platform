import { motion, useReducedMotion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'

export interface TacticalEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}

/**
 * Liste vide — icône outline dorée, respiration lente, titrage Rajdhani.
 */
export default function TacticalEmptyState({
  icon: Icon,
  title,
  description,
  className = '',
}: TacticalEmptyStateProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      className={`tactical-bento flex flex-col items-center justify-center gap-4 px-6 py-14 text-center ${className}`}
      role="status"
    >
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-omjep-gold/35 bg-omjep-gold/[0.06]"
        animate={
          reduceMotion
            ? { opacity: 0.9, scale: 1 }
            : { opacity: [0.55, 1, 0.55], scale: [0.98, 1.02, 0.98] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <Icon className="h-8 w-8 text-omjep-gold/90" strokeWidth={1.15} aria-hidden />
      </motion.div>
      <div className="max-w-md space-y-2">
        <p className="font-heading text-base font-extrabold uppercase italic tracking-[0.12em] text-omjep-gold md:text-lg">
          {title}
        </p>
        {description ? (
          <p className="font-sans text-sm leading-relaxed text-omjep-neutral">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
