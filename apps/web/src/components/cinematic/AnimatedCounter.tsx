import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'

type AnimatedCounterProps = {
  value: number
  className?: string
  format?: (n: number) => string
  'aria-label'?: string
}

const defaultFormat = (n: number) => n.toLocaleString('fr-FR')

/**
 * Compteur 0 → valeur au scroll, ressort (useSpring).
 */
export function AnimatedCounter({
  value,
  className = '',
  format = defaultFormat,
  'aria-label': ariaLabel,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6, margin: '0px 0px -10% 0px' })
  const [display, setDisplay] = useState(0)
  const base = useMotionValue(0)
  const spring = useSpring(base, { stiffness: 60, damping: 28, mass: 0.4 })

  useEffect(() => {
    if (inView) base.set(value)
  }, [inView, value, base])

  useMotionValueEvent(spring, 'change', (v) => {
    setDisplay(Math.round(v))
  })

  return (
    <span ref={ref} className={className} aria-label={ariaLabel ?? `Valeur ${format(value)}`}>
      {format(display)}
    </span>
  )
}
