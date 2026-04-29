import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Crown } from 'lucide-react'

interface AppLoaderProps {
  active: boolean
}

export default function AppLoader({ active }: AppLoaderProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="app-loader-overlay fixed inset-0 z-[120] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-300/15 to-transparent"
            initial={{ x: '-140%' }}
            animate={{ x: '360%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <div className="app-loader-panel app-loader-shimmer flex w-[min(250px,90vw)] flex-col items-center gap-3 px-6 py-7">
            <motion.div
              animate={prefersReducedMotion ? { rotate: 0, scale: 1 } : { rotate: 360, scale: [1, 1.03, 1] }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="app-loader-emblem rounded-xl p-3"
            >
              <Crown className="h-6 w-6 text-amber-200 dark:text-amber-300" />
            </motion.div>
            <p className="app-loader-title font-tech text-xs font-bold uppercase tracking-[0.18em]">
              Initialisation de la plateforme
            </p>
            <p className="app-loader-subtitle text-[10px] font-semibold uppercase tracking-[0.14em]">
              Chargement des donnees en cours
            </p>
            <div className="app-loader-progress h-1.5 w-44 overflow-hidden rounded-full">
              <motion.div
                className="app-loader-progress-bar h-full"
                initial={prefersReducedMotion ? { x: 0 } : { x: '-100%' }}
                animate={prefersReducedMotion ? { x: 0 } : { x: '100%' }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
