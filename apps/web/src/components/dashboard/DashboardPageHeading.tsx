import type { ReactNode } from 'react'

interface DashboardPageHeadingProps {
  eyebrow: string
  title: string
  subtitle: string
  action?: ReactNode
  className?: string
}

export default function DashboardPageHeading({
  eyebrow,
  title,
  subtitle,
  action,
  className = '',
}: DashboardPageHeadingProps) {
  return (
    <header
      className={`dashboard-page-heading flex flex-col gap-4 border-b border-omjep-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between ${className}`.trim()}
    >
      <div className="min-w-0 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-omjep-text-muted">{eyebrow}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-omjep-text-primary sm:text-4xl">{title}</h1>
        <p className="max-w-3xl text-sm text-omjep-text-secondary">{subtitle}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
