import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

type CinematicRouteStageProps = {
  children: ReactNode
  className?: string
  /** Nombre de section à interpréter pour la direction (ex: 1=cockpit, 2=mercato…) */
  flowKey?: string
}

/**
 * Stage qui anime les changements de route :
 * - HUB (`/dashboard`) : transition simple
 * - module (autre route) : ouverture en cinématique (zoom + overlay sombre)
 * - retour vers HUB : sortie en zoom-out
 */
export default function CinematicRouteStage({ children, className = '', flowKey }: CinematicRouteStageProps) {
  const location = useLocation()
  const reduce = useReducedMotion()
  const previous = useRef<string>(location.pathname)
  const isHub = location.pathname === '/dashboard'

  useEffect(() => {
    previous.current = location.pathname
  }, [location.pathname])

  const direction = useMemo(() => {
    const prev = previous.current
    if (prev === location.pathname) return 0
    if (prev === '/dashboard' && !isHub) return 1
    if (prev !== '/dashboard' && isHub) return -1
    return prev < location.pathname ? 1 : -1
  }, [location.pathname, isHub])

  const variants = {
    enter: (dir: number) =>
      reduce
        ? { opacity: 0 }
        : isHub
          ? { opacity: 0, scale: 1.04, x: 0 }
          : { opacity: 0, scale: 0.92, x: dir * 60 },
    center: { opacity: 1, scale: 1, x: 0 },
    exit: (dir: number) =>
      reduce
        ? { opacity: 0 }
        : isHub
          ? { opacity: 0, scale: 0.96 }
          : { opacity: 0, scale: 1.04, x: dir * -40 },
  }

  return (
    <div className={`cinematic-stage relative h-full w-full ${className}`.trim()}>
      <AnimatePresence custom={direction} mode="wait" initial={false}>
        {!isHub ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.88 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(0,0,0,0)_30%,rgba(0,0,0,0.78)_85%)]"
            aria-hidden
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence custom={direction} mode="wait" initial={false}>
        <motion.div
          key={`${flowKey ?? location.pathname}-stage`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 220, damping: 30 }}
          className="cinematic-stage__inner relative z-10 h-full w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
