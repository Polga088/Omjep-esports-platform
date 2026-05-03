import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface AppLoaderProps {
  active: boolean
}

export default function AppLoader({ active }: AppLoaderProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[color-mix(in_srgb,var(--omjep-bg)_94%,var(--omjep-bg-elevated))] backdrop-blur-[3px] dark:bg-[color-mix(in_srgb,var(--omjep-bg)_92%,#07060c)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-50"
            aria-hidden
            style={{
              backgroundImage: `radial-gradient(ellipse 55% 42% at 50% 0%, color-mix(in srgb, var(--omjep-mauve) 18%, transparent), transparent 72%)`,
            }}
          />
          <motion.div
            className="relative flex w-[min(340px,92vw)] flex-col items-center gap-5 rounded-2xl border border-[color-mix(in_srgb,var(--omjep-border)_88%,var(--omjep-mauve)_12%)] bg-[color-mix(in_srgb,var(--omjep-bg-panel)_96%,var(--omjep-bg-elevated))] px-8 py-10 shadow-[var(--omjep-shadow-lg)] ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_70%,transparent)] dark:border-[color-mix(in_srgb,var(--omjep-border-gold)_32%,var(--omjep-border))] dark:bg-[color-mix(in_srgb,var(--omjep-bg-panel)_88%,#08060f)] dark:ring-[color-mix(in_srgb,var(--omjep-gold)_12%,transparent)]"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--omjep-border-gold)_50%,transparent)] bg-[color-mix(in_srgb,var(--omjep-gold)_14%,var(--omjep-bg-panel-soft))] shadow-[var(--omjep-glow-gold-soft)] dark:bg-[color-mix(in_srgb,var(--omjep-gold)_12%,transparent)]"
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: [0.82, 1, 0.82], scale: [0.99, 1, 0.99] }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
              }
              aria-hidden
            >
              <span className="font-heading text-lg font-black tracking-[0.08em] text-omjep-mauve dark:text-[color-mix(in_srgb,var(--omjep-gold)_95%,#fff)]">
                OM
              </span>
            </motion.div>
            <div className="space-y-1 text-center">
              <p className="font-heading text-[11px] font-extrabold uppercase tracking-[0.28em] text-omjep-text-primary">
                OMJEP
              </p>
              <p className="text-[12px] font-medium leading-snug text-omjep-text-secondary text-balance">
                Préparation de votre session…
              </p>
            </div>
            <div className="relative h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,var(--omjep-bg-panel-soft))] dark:bg-[color-mix(in_srgb,var(--omjep-border)_75%,transparent)]">
              <motion.div
                className="absolute top-0 h-full w-[42%] rounded-full bg-gradient-to-r from-[color-mix(in_srgb,var(--omjep-mauve)_78%,transparent)] to-[color-mix(in_srgb,var(--omjep-gold)_72%,transparent)]"
                animate={
                  prefersReducedMotion
                    ? { left: '0%', width: '100%', opacity: 0.5 }
                    : { left: ['-42%', '100%'] }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0.3 }
                    : { duration: 1.35, repeat: Infinity, ease: 'linear' }
                }
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
