import { motion } from 'framer-motion'
import { BadgeCheck, Goal, Shield } from 'lucide-react'
import type { PlayerProfileData } from '@/data/dashboard'

interface PlayerProfileProps {
  player: PlayerProfileData
}

const resultClassMap: Record<'W' | 'L' | 'D', string> = {
  W: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
  L: 'border-rose-400/40 bg-rose-500/20 text-rose-200',
  D: 'border-slate-400/40 bg-slate-500/20 text-slate-200',
}

export default function PlayerProfile({ player }: PlayerProfileProps) {
  return (
    <motion.section
      id="player-profile"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45 }}
      className="overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-slate-950 to-slate-900 p-5 shadow-[0_0_0_1px_rgba(212,175,55,0.16)] sm:p-7"
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img src={player.avatarUrl} alt={`Avatar de ${player.gamertag}`} className="h-20 w-20 rounded-2xl border border-emerald-400/30 object-cover" />
            <div>
              <div className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100">
                Pro Player
              </div>
              <h2 className="mt-2 text-2xl font-black text-white">{player.gamertag}</h2>
              <p className="text-sm text-slate-300">{player.fullName}</p>
              <p className="text-xs uppercase tracking-wider text-emerald-300">{player.club}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard label="Rang national" value={`#${player.nationalRank}`} />
            <StatCard label="Points" value={player.points.toLocaleString('fr-FR')} />
            <StatCard label="Win rate" value={`${player.winRate.toFixed(1)}%`} />
            <StatCard label="Buts marqués / encaissés" value={`${player.goalsScored} / ${player.goalsConceded}`} />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400">Forme récente</span>
            {player.recentForm.map((form, index) => (
              <span key={`form-${index}`} className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${resultClassMap[form]}`}>
                {form}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Derniers matchs</h3>
            <div className="mt-3 space-y-2">
              {player.lastMatches.map((match) => (
                <div key={match.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{match.opponent}</p>
                    <p className="text-xs text-slate-400">{match.competition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{match.score}</p>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${resultClassMap[match.result]}`}>
                      {match.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Achievements</h3>
            <ul className="mt-3 space-y-2">
              {player.achievements.map((achievement) => (
                <li key={achievement.id} className="flex items-center gap-2 text-sm text-slate-200">
                  <BadgeCheck className="h-4 w-4 text-amber-300" aria-hidden />
                  {achievement.label}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
              aria-label="Voir le profil complet du joueur"
            >
              Voir profil complet
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

interface StatCardProps {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
        <Goal className="h-3 w-3" aria-hidden />
        <Shield className="h-3 w-3" aria-hidden />
      </div>
    </div>
  )
}
