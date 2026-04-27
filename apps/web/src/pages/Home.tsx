import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import {
  ChevronRight,
  Crown,
  Flame,
  Medal,
  Newspaper,
  Shield,
  Swords,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import HeroArena from '@/components/cinematic/HeroArena'
import ScrollRevealSection from '@/components/cinematic/ScrollRevealSection'
import { AnimatedCounter } from '@/components/cinematic/AnimatedCounter'
import PlayerLeaderboard from '@/components/cinematic/PlayerLeaderboard'
import ProfileSection from '@/components/cinematic/ProfileSection'
import MVPSpotlight from '@/components/cinematic/MVPSpotlight'

interface PlatformStats {
  totalPlayers: number
  totalClubs: number
  transferVolume: number
  totalMatches: number
}

interface HallOfFameEntry {
  competition: { id: string; name: string; type: string }
  seasonLabel: string
  champion: { id: string; name: string; logo_url: string | null } | null
  goldenBoot: { ea_persona_name: string; goals: number } | null
}

interface NewsEvent {
  id: string
  title: string
  description: string
  created_at: string
  metadata: {
    playerName?: string
    toTeamName?: string
    transferFee?: number
    releaseClauseMet?: boolean
  } | null
}

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function TransferCard({ item, index }: { item: NewsEvent; index: number }) {
  const isClause = item.metadata?.releaseClauseMet
  return (
    <div
      className={`relative w-72 max-w-full flex-shrink-0 rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:shadow-xl ${
        isClause
          ? 'border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-[#0a0a0c] hover:shadow-violet-900/20'
          : 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-[#0a0a0c] hover:shadow-emerald-950/30'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {isClause && (
        <span className="absolute -top-2 left-4 rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
          Clause libératoire
        </span>
      )}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
            isClause ? 'bg-violet-500/15' : 'bg-emerald-500/12'
          }`}
        >
          <Newspaper className={`h-5 w-5 ${isClause ? 'text-violet-400' : 'text-emerald-400'}`} />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-xs font-bold leading-snug text-white">{item.title}</p>
          {item.metadata?.playerName && (
            <p className="mt-1 truncate text-xs text-slate-400">
              {item.metadata.playerName}
              {item.metadata.toTeamName && (
                <span className="text-emerald-400"> → {item.metadata.toTeamName}</span>
              )}
            </p>
          )}
          {typeof item.metadata?.transferFee === 'number' && item.metadata.transferFee > 0 && (
            <p className="mt-1.5 text-xs font-bold text-emerald-400">
              {formatNumber(item.metadata.transferFee)} OC
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const authed = isAuthenticated()
  const reducedMotion = useReducedMotion()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [hof, setHof] = useState<HallOfFameEntry[]>([])
  const [news, setNews] = useState<NewsEvent[]>([])

  useEffect(() => {
    const load = async () => {
      const [statsRes, hofRes, newsRes] = await Promise.allSettled([
        api.get<PlatformStats>('/stats/public'),
        api.get<HallOfFameEntry[]>('/competitions/hall-of-fame'),
        api.get<NewsEvent[]>('/news/transfers?limit=8'),
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (hofRes.status === 'fulfilled') setHof(hofRes.value.data.slice(0, 3))
      if (newsRes.status === 'fulfilled') setNews(newsRes.value.data)
    }
    load()
  }, [])

  const statsLine =
    stats != null ? (
      <>
        Déjà{' '}
        <span className="font-semibold text-slate-200">
          {stats.totalPlayers.toLocaleString('fr-FR')}
        </span>{' '}
        joueurs dans{' '}
        <span className="font-semibold text-slate-200">{stats.totalClubs}</span> clubs actifs
      </>
    ) : null

  return (
    <div className="flex flex-col">
      <HeroArena statsLine={statsLine} reducedMotion={reducedMotion ?? false} />

      <ScrollRevealSection className="border-y border-emerald-500/10 bg-emerald-500/[0.04] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            <div className="flex items-center justify-center sm:justify-start">
              <div className="flex w-full max-w-xs items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-heading text-3xl font-black tracking-tight text-white">
                    <AnimatedCounter value={stats?.totalPlayers ?? 0} />
                  </p>
                  <p className="text-sm text-slate-500">Joueurs inscrits</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <div className="flex w-full max-w-xs items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-heading text-3xl font-black tracking-tight text-white">
                    <AnimatedCounter value={stats?.totalClubs ?? 0} />
                  </p>
                  <p className="text-sm text-slate-500">Clubs actifs</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <div className="flex w-full max-w-xs items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Swords className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-heading text-3xl font-black tracking-tight text-white">
                    <AnimatedCounter value={stats?.totalMatches ?? 0} />
                  </p>
                  <p className="text-sm text-slate-500">Matchs joués</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <div className="flex w-full max-w-xs items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-heading text-2xl font-black tracking-tight text-white sm:text-3xl">
                    <AnimatedCounter value={stats?.transferVolume ?? 0} format={(n) => `${formatNumber(n)}`} />
                    <span className="text-lg text-emerald-400/90"> OC</span>
                  </p>
                  <p className="text-sm text-slate-500">Volume transferts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollRevealSection>

      <ScrollRevealSection id="leaderboard" className="py-16 sm:py-20" aria-label="Classement joueurs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">Classement live</h2>
            <p className="mt-1 font-sans text-sm text-slate-500">Top scène — filtre en direct (démo data)</p>
          </div>
          <PlayerLeaderboard competitionId={hof[0]?.competition.id} />
        </div>
      </ScrollRevealSection>

      <ScrollRevealSection className="py-12 sm:py-16" aria-label="Fiche profil type FIFA">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProfileSection />
        </div>
      </ScrollRevealSection>

      <ScrollRevealSection className="py-8 sm:py-12" aria-label="MVP de la semaine">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <MVPSpotlight />
        </div>
      </ScrollRevealSection>

      {news.length > 0 && (
        <ScrollRevealSection className="py-16" aria-label="Derniers transferts">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/90">Live</span>
                </div>
                <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">Derniers transferts</h2>
                <p className="mt-1 font-sans text-sm text-slate-500">Mouvements officiels en temps réel</p>
              </div>
              <Link
                to="/register"
                className="hidden text-sm font-semibold text-emerald-400 transition hover:text-emerald-300 sm:inline-flex"
              >
                Rejoindre
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
              {news.map((item, i) => (
                <TransferCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>
        </ScrollRevealSection>
      )}

      {hof.length > 0 && (
        <ScrollRevealSection className="border-t border-white/[0.06] py-20" aria-label="Aperçu palmarès">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/90">Palmarès</span>
              </div>
              <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">Les champions de l’histoire</h2>
              <p className="mx-auto mt-2 max-w-xl text-slate-400">
                Rejoignez la plateforme et gravez votre nom dans l’histoire OMJEP.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {hof.map((entry, i) => (
                <div
                  key={entry.competition.id}
                  className={`relative overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-2xl ${
                    i === 0
                      ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/12 to-[#0a0a0c] hover:shadow-emerald-950/40'
                      : 'border-white/8 bg-gradient-to-br from-white/[0.03] to-[#0a0a0c] hover:shadow-slate-900/30'
                  }`}
                >
                  {i === 0 && (
                    <div className="absolute right-3 top-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/15">
                        <Crown className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  <div className="p-6">
                    <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">{entry.seasonLabel}</p>
                    <h3 className="mb-4 pr-8 font-heading text-lg font-bold text-white">
                      {entry.competition.name}
                    </h3>

                    {entry.champion ? (
                      <div className="mb-4 flex items-center gap-3">
                        {entry.champion.logo_url ? (
                          <img
                            src={entry.champion.logo_url}
                            alt={entry.champion.name}
                            className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl text-base font-bold ${
                              i === 0 ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            {entry.champion.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">Champion</p>
                          <p className="font-bold text-white">{entry.champion.name}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="mb-4 text-sm text-slate-600">Champion non déterminé</p>
                    )}

                    {entry.goldenBoot && (
                      <div className="flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-slate-400">
                        <Star className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                        <span>
                          <span className="font-semibold text-emerald-300">
                            {entry.goldenBoot.ea_persona_name}
                          </span>
                          {' — '}
                          {entry.goldenBoot.goals} buts
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                to="/hall-of-fame"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/10"
              >
                <Medal className="h-4 w-4" />
                Palmarès complet
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </ScrollRevealSection>
      )}

      <ScrollRevealSection className="border-t border-white/[0.06] py-20" aria-label="Fonctionnalités">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="mb-3 font-heading text-3xl font-bold text-white sm:text-4xl">Une plateforme complète</h2>
            <p className="mx-auto max-w-xl text-slate-400">
              Compétition, mercato, progression — tout le cycle EA FC, dans un hub unique.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Swords,
                title: 'Compétitions officielles',
                desc: 'Ligues, coupes et grands formats — rythme OMJEP.',
                cls: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400',
              },
              {
                icon: Users,
                title: 'Mercato & transferts',
                desc: 'Agents libres, négociations, clauses, tout est tracé.',
                cls: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300',
              },
              {
                icon: TrendingUp,
                title: 'Stats & gamification',
                desc: 'Progression, badges, comparaisons — le jeu continue hors terrain.',
                cls: 'border-white/10 bg-white/[0.04] text-emerald-400',
              },
            ].map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] p-7 transition-all hover:border-emerald-500/20 hover:bg-white/[0.04]"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl border transition-all ${f.cls}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-heading text-xl font-bold text-white">{f.title}</h3>
                  <p className="font-sans text-sm leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </ScrollRevealSection>

      <ScrollRevealSection className="py-20" aria-label="Call to action">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[100px]" />

            <div className="relative p-12 text-center sm:p-16">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/40 to-emerald-800/30 shadow-[0_0_40px_-8px_rgba(34,197,94,0.45)]">
                <Crown className="h-8 w-8 text-white" fill="currentColor" />
              </div>
              <h2 className="mb-3 font-heading text-4xl font-black tracking-tight text-white sm:text-5xl">
                Prêt à dominer ?
              </h2>
              <p className="mx-auto mb-3 max-w-lg text-lg text-slate-400">
                {authed ? (
                  <>Ligues, mercato, stats : tout est sur ton dashboard.</>
                ) : (
                  <>
                    Inscription gratuite +{' '}
                    <span className="font-bold text-emerald-300">500 OMJEP Coins</span> de bienvenue.
                  </>
                )}
              </p>
              <p className="mb-10 text-sm text-slate-600">OMJEP — Fédération E-sport Maroc</p>
              {authed ? (
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-[48px] items-center gap-3 rounded-xl border border-emerald-400/40 bg-[#020202] px-10 py-4 text-lg font-bold text-white shadow-[0_0_32px_-8px_rgba(34,197,94,0.45)] transition-all hover:border-emerald-400/55"
                >
                  <Crown className="h-5 w-5 text-emerald-300" fill="currentColor" />
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex min-h-[48px] items-center gap-3 rounded-xl border border-emerald-400/35 bg-[#020202] px-10 py-4 text-lg font-bold text-white shadow-[0_0_28px_-8px_rgba(34,197,94,0.4)] transition-all hover:border-emerald-400/50"
                >
                  <Crown className="h-5 w-5 text-emerald-300" fill="currentColor" />
                  Créer un compte
                </Link>
              )}
            </div>
          </div>
        </div>
      </ScrollRevealSection>
    </div>
  )
}
