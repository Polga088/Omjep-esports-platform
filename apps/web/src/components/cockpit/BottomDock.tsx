import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { playCockpitModuleSwitch } from '@/lib/uiSound'
import { useTheme } from '@/context/ThemeContext'

export type DockItem = {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

type BottomDockProps = {
  items: DockItem[]
  /** Item central proéminent (ex: "Cockpit" → /dashboard) */
  centerItem?: DockItem
  className?: string
  onItemClick?: (item: DockItem) => void
}

/**
 * Dock flottant en bas — backdrop-blur-2xl, navigation principale.
 */
export default function BottomDock({ items, centerItem, className = '', onItemClick }: BottomDockProps) {
  const location = useLocation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isActive = (it: DockItem) =>
    it.exact ? location.pathname === it.to : location.pathname.startsWith(it.to)

  const sliced = useMemo(() => {
    if (!centerItem) return { left: items, right: [] }
    const half = Math.ceil(items.length / 2)
    return { left: items.slice(0, half), right: items.slice(half) }
  }, [items, centerItem])

  const handleModuleActivate = (it: DockItem) => {
    if (!isActive(it)) playCockpitModuleSwitch()
    onItemClick?.(it)
  }

  const renderItem = (it: DockItem) => {
    const Icon = it.icon
    const active = isActive(it)
    return (
      <Link
        key={it.to}
        to={it.to}
        onClick={() => handleModuleActivate(it)}
        aria-label={it.label}
        aria-current={active ? 'page' : undefined}
        className={`dock-item group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-none border transition-none ${
          active
            ? isDark
              ? 'border-white/25 bg-white/5 text-white'
              : 'text-black'
            : isDark
              ? 'border-white/10 text-white/65 hover:text-white'
              : 'border-black/10 text-black/65 hover:text-black'
        }`}
      >
        <Icon className="h-5 w-5 stroke-[1]" aria-hidden />
        <span className={`pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] group-hover:block ${isDark ? 'border-white/15 bg-black/90 text-white/70' : 'border-black/10 bg-white/90 text-black/55'}`}>
          {it.label}
        </span>
      </Link>
    )
  }

  return (
    <motion.nav
      role="navigation"
      aria-label="Cockpit dock"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.2 }}
      className={`pointer-events-auto fixed bottom-5 left-1/2 z-50 -translate-x-1/2 ${className}`.trim()}
    >
      <div className={`flex items-center gap-2 rounded-none border p-2 backdrop-blur-xl ${isDark ? 'border-white/20 bg-black/80' : 'border-black/10 bg-white/80'}`}>
        {centerItem ? (
          <>
            <div className="flex items-center gap-1.5">{sliced.left.map(renderItem)}</div>
            {(() => {
              const Icon = centerItem.icon
              const active = isActive(centerItem)
              return (
                <Link
                  to={centerItem.to}
                  onClick={() => handleModuleActivate(centerItem)}
                  aria-current={active ? 'page' : undefined}
                  className={`dock-center group relative flex h-14 w-14 items-center justify-center rounded-none border transition-none ${
                    active
                      ? isDark
                        ? 'border-white/30 bg-white/5 text-white'
                        : 'border-black/15 bg-black/[0.03] text-black'
                      : isDark
                        ? 'border-white/10 text-white/75 hover:text-white'
                        : 'border-black/10 text-black/70 hover:text-black'
                  }`}
                >
                  <Icon className="h-6 w-6 stroke-[1]" aria-hidden />
                  <span className={`pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] group-hover:block ${isDark ? 'border-white/15 bg-black/90 text-white/70' : 'border-black/10 bg-white/90 text-black/55'}`}>
                    {centerItem.label}
                  </span>
                </Link>
              )
            })()}
            <div className="flex items-center gap-1.5">{sliced.right.map(renderItem)}</div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">{items.map(renderItem)}</div>
        )}
      </div>
    </motion.nav>
  )
}
