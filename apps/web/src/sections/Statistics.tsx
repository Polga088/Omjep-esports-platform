import { BarChart3 } from 'lucide-react'
import type { KpiItem } from '@/data/dashboard'

interface StatisticsProps {
  items: KpiItem[]
}

const getProgressClassName = (progress: number) => {
  if (progress >= 90) return 'w-[92%]'
  if (progress >= 80) return 'w-[84%]'
  if (progress >= 70) return 'w-[76%]'
  if (progress >= 60) return 'w-[68%]'
  return 'w-[56%]'
}

export default function Statistics({ items }: StatisticsProps) {
  return (
    <section id="statistics" className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-emerald-300" aria-hidden />
        <h2 className="text-lg font-bold text-white sm:text-xl">KPIs Compétition</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
          >
            <p className="text-xs uppercase tracking-wider text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
            <p className="mt-1 text-xs text-emerald-300">{item.trend}</p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-800">
              <div className={`h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-amber-300 ${getProgressClassName(item.progress)}`} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
