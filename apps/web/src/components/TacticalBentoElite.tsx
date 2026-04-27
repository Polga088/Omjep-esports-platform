import type { ReactNode } from 'react'
import { AutoSparkline } from '@/components/tactical/MicroViz'

export type TacticalBentoEliteProps = {
  serial: string
  title: string
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/**
 * Module HUD tactique : header gravé, rim métal (border-image), scanlines 3 %, sparkline autonome.
 */
export default function TacticalBentoElite({
  serial,
  title,
  children,
  className = '',
  bodyClassName = '',
}: TacticalBentoEliteProps) {
  return (
    <section
      className={`tactical-bento-elite flex min-h-0 flex-col ${className}`.trim()}
      aria-label={title}
    >
      <div className="tactical-bento-elite__rim" aria-hidden />
      <div className="tactical-bento-elite__scanlines" aria-hidden />
      <header className="tactical-bento-elite__head flex shrink-0 items-center justify-between gap-3 border-b border-dashed border-emerald-500/30 px-4 py-2.5">
        <span className="tactical-os-label max-w-[62%] truncate text-[10px] text-emerald-300/95 [filter:drop-shadow(0_0_10px_rgba(34,197,94,0.35))]">{title}</span>
        <div className="flex shrink-0 items-center gap-2">
          <AutoSparkline className="opacity-95 [filter:drop-shadow(0_0_10px_rgba(34,197,94,0.35))]" height={22} />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300/90 [filter:drop-shadow(0_0_8px_rgba(34,197,94,0.38))]">
            {serial}
          </span>
        </div>
      </header>
      <div className={`tactical-bento-elite__body min-h-0 flex-1 p-4 sm:p-5 ${bodyClassName}`.trim()}>{children}</div>
    </section>
  )
}
