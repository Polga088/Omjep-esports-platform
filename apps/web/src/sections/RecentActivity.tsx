import { Activity } from 'lucide-react'
import type { ActivityItem } from '@/data/dashboard'

interface RecentActivityProps {
  activity: ActivityItem[]
}

const dotClassMap: Record<ActivityItem['type'], string> = {
  match: 'bg-emerald-400',
  ranking: 'bg-amber-300',
  transfer: 'bg-blue-300',
  community: 'bg-rose-300',
}

export default function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <section id="recent-activity" className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-300" aria-hidden />
        <h2 className="text-lg font-bold text-white sm:text-xl">Activité récente</h2>
      </div>
      <div className="space-y-3">
        {activity.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${dotClassMap[item.type]}`} aria-hidden />
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
            </div>
            <p className="mt-1 text-sm text-slate-300">{item.description}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">{item.timestamp}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
