import { motion, AnimatePresence } from 'framer-motion'
import { Crown } from 'lucide-react'

interface AppLoaderProps {
  active: boolean
}

export default function AppLoader({ active }: AppLoaderProps) {
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
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-300/25 to-transparent"
            initial={{ x: '-140%' }}
            animate={{ x: '360%' }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
          <div className="tactical-bento tactical-skeleton-shimmer flex min-w-[220px] flex-col items-center gap-3 px-6 py-7">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3"
            >
              <Crown className="h-6 w-6 text-amber-300" />
            </motion.div>
            <p className="font-tech text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
              Tactical Deep
            </p>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-cyan-400"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
