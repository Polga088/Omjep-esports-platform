import type { ReactNode } from 'react'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import api from '@/lib/api'
import type { PublicLandingMediaPayload } from '@/types/public-landing-media'
import {
  ArrowRight,
  Award,
  ChevronRight,
  Crown,
  Sparkles,
  Trophy,
} from 'lucide-react'

/** Source unique — cohérence stricte entre hero, cartes, champions et records. */
export const PALMARES_DATA = {
  stats: { competitions: 3, saisons: 27, champions: 128 },
  competitions: [
    {
      id: 'ligue-elite',
      badge: 'SAISON 2026',
      label: 'LIGUE OFFICIELLE',
      title: 'Ligue Elite OMJEP',
      desc: 'Le championnat national des clubs Pro Clubs EA FC. L’élite, week after week.',
      trophy: 'league' as const,
    },
    {
      id: 'coupe-trone',
      badge: 'SAISON 2026',
      label: 'COUPE NATIONALE',
      title: 'Coupe du Trône eFootball',
      desc: 'La coupe à élimination directe où chaque match peut écrire l’histoire.',
      trophy: 'cup' as const,
    },
    {
      id: 'ucl',
      badge: 'SAISON 2026',
      label: 'COMPÉTITION INTERNATIONALE',
      title: 'OMJEP Champions League',
      desc: 'L’élite marocaine face aux meilleurs clubs de la région. La quête de la gloire continentale.',
      trophy: 'ucl' as const,
    },
  ],
  championsRecent: [
    {
      comp: 'Ligue Elite OMJEP',
      club: 'Atlas Wolves',
      status: 'Champion',
      saison: 'Saison 2026',
      initials: 'AW',
      mediaKey: 'atlas-wolves',
    },
    {
      comp: 'Coupe du Trône eFootball',
      club: 'Rabat United',
      status: 'Champion',
      saison: 'Saison 2026',
      initials: 'RU',
      mediaKey: 'rabat-united',
    },
    {
      comp: 'OMJEP Champions League',
      club: 'Casablanca Kings',
      status: 'Champion',
      saison: 'Saison 2026',
      initials: 'CK',
      mediaKey: 'casablanca-kings',
    },
  ],
  records: [
    {
      label: 'Plus de titres (toutes compétitions)',
      holder: 'Atlas Wolves',
      value: '7',
      valueSuffix: '',
    },
    {
      label: 'Séries d’invincibilité',
      holder: 'Rabat United',
      value: '18',
      valueSuffix: ' matchs',
    },
    {
      label: 'Meilleure défense (saison)',
      holder: 'Casablanca Kings',
      value: '9',
      valueSuffix: ' buts encaissés',
    },
  ],
} as const

function buildPalmaresViewModel(media: PublicLandingMediaPayload | undefined) {
  const compM = media?.palmaresCompetitionsMedia ?? {}
  const champM = media?.palmaresChampionsMedia ?? {}
  return {
    stats: PALMARES_DATA.stats,
    heroVisualUrl: media?.palmaresHeroVisualUrl ?? null,
    competitions: PALMARES_DATA.competitions.map((c) => ({
      ...c,
      trophyImageUrl: compM[c.id]?.trophyImageUrl ?? null,
      cardImageUrl: compM[c.id]?.cardImageUrl ?? null,
    })),
    championsRecent: PALMARES_DATA.championsRecent.map((ch) => ({
      ...ch,
      badgeImageUrl: champM[ch.mediaKey]?.badgeImageUrl ?? null,
    })),
    records: PALMARES_DATA.records,
  }
}

function FadeBlock({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.42, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Trophée hero — emblème métal or / violet, pentagramme discret, halos & étincelles. */
function HeroTrophyMonument() {
  const uid = useId().replace(/:/g, '')
  const gBody = `palmares-hero-body-${uid}`
  const gGold = `palmares-hero-gold-${uid}`
  const gRim = `palmares-hero-rim-${uid}`
  const gStar = `palmares-hero-starstroke-${uid}`
  const fGlow = `palmares-hero-fglow-${uid}`
  const fShine = `palmares-hero-shine-${uid}`
  return (
    <div className="palmares-hero-trophy relative mx-auto flex max-w-[min(100%,380px)] items-center justify-center lg:mx-0 lg:max-w-none">
      <div
        className="pointer-events-none absolute inset-[-8%] rounded-[45%] bg-[radial-gradient(ellipse_at_50%_38%,color-mix(in_srgb,var(--omjep-gold)_22%,transparent),transparent_62%)] blur-3xl motion-reduce:blur-xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-[-12%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_srgb,var(--omjep-mauve)_38%,transparent),transparent_70%)] blur-3xl motion-reduce:blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-2 left-1/2 h-14 w-[78%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-xl"
        aria-hidden
      />
      <svg
        viewBox="0 0 320 340"
        className="relative z-[1] h-auto w-full max-w-[300px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.55)] motion-reduce:drop-shadow-[0_12px_28px_rgba(0,0,0,0.4)] lg:max-w-[320px]"
        fill="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gBody} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ede9fe" />
            <stop offset="28%" stopColor="#7c3aed" />
            <stop offset="72%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#1e1033" />
          </linearGradient>
          <linearGradient id={gGold} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id={gRim} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id={gStar} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--omjep-gold) 55%, transparent)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--omjep-mauve) 40%, transparent)" />
          </linearGradient>
          <filter id={fGlow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={fShine} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`palmares-hero-jewel-${uid}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <g opacity="0.52" aria-hidden>
          <path
            d="M52 218 Q78 92 128 82 L138 112 Q94 122 62 212 Z"
            fill={`url(#${gGold})`}
            stroke="color-mix(in srgb, var(--omjep-gold) 38%, transparent)"
            strokeWidth="1.1"
          />
          <path
            d="M268 218 Q242 92 192 82 L182 112 Q226 122 258 212 Z"
            fill={`url(#${gGold})`}
            stroke="color-mix(in srgb, var(--omjep-gold) 38%, transparent)"
            strokeWidth="1.1"
          />
          <path
            d="M160 62 L146 118 L160 128 L174 118 Z"
            fill={`url(#${gBody})`}
            opacity="0.88"
            filter={`url(#${fGlow})`}
          />
        </g>
        <path
          d="M160 70 L223.5 265.4 L57.3 144.6 L262.7 144.6 L96.6 265.4 Z"
          fill="none"
          stroke={`url(#${gStar})`}
          strokeWidth="1.2"
          opacity="0.14"
        />
        <path
          d="M160 78 L216 252 L64 152 L256 152 L104 252 Z"
          fill="none"
          stroke="color-mix(in srgb, var(--omjep-mauve) 35%, transparent)"
          strokeWidth="0.85"
          opacity="0.22"
        />
        <g className="palmares-hero-sparks motion-reduce:hidden" opacity="0.85">
          <circle cx="98" cy="118" r="2.2" fill="#fef3c7" />
          <circle cx="238" cy="104" r="1.6" fill="#fde68a" />
          <circle cx="212" cy="198" r="1.4" fill="#e9d5ff" />
          <circle cx="78" cy="210" r="1.5" fill="#fbbf24" />
          <circle cx="270" cy="168" r="1.2" fill="#fff" opacity="0.7" />
        </g>
        <ellipse cx="160" cy="302" rx="102" ry="16" fill="rgba(0,0,0,0.42)" />
        <path
          d="M92 124h136v14c0 48-30 86-68 98v32h-32v-32c-38-12-68-50-68-98v-14z"
          fill={`url(#${gBody})`}
          stroke="color-mix(in srgb, var(--omjep-gold) 48%, transparent)"
          strokeWidth="2.2"
          filter={`url(#${fGlow})`}
        />
        <path
          d="M84 124H58c0 46 22 80 58 96M236 124h26c0-46-22-80-58-96"
          stroke={`url(#${gRim})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.92"
        />
        <rect
          x="122"
          y="76"
          width="76"
          height="54"
          rx="9"
          fill={`url(#${gGold})`}
          stroke="color-mix(in srgb, var(--omjep-gold) 65%, #fff)"
          strokeWidth="2"
        />
        <path
          d="M128 88h104v8H128z"
          fill="rgba(255,255,255,0.22)"
          opacity="0.5"
          filter={`url(#${fShine})`}
        />
        <path
          d="M138 54h44l10 26h-64l10-26z"
          fill="color-mix(in srgb, var(--omjep-mauve) 92%, #000)"
          stroke="color-mix(in srgb, var(--omjep-gold) 50%, transparent)"
          strokeWidth="1.6"
        />
        <circle cx="160" cy="102" r="11" fill={`url(#palmares-hero-jewel-${uid})`} />
        <path
          d="M128 262h64v34h-64z"
          fill="color-mix(in srgb, var(--omjep-mauve) 94%, #000)"
          stroke="color-mix(in srgb, var(--omjep-gold) 42%, transparent)"
          strokeWidth="1.6"
        />
        <path d="M136 262h48v6H136z" fill="rgba(255,255,255,0.06)" />
        <text
          x="160"
          y="248"
          textAnchor="middle"
          fill="color-mix(in srgb, var(--omjep-gold) 88%, #fff)"
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.38em"
          opacity="0.9"
        >
          OMJEP
        </text>
      </svg>
    </div>
  )
}

function HeroTrophyVisual({ heroVisualUrl }: { heroVisualUrl: string | null }) {
  if (heroVisualUrl) {
    return (
      <div className="relative mx-auto flex max-w-[min(100%,400px)] justify-center lg:mx-0 lg:max-w-none">
        <div
          className="pointer-events-none absolute inset-[-10%] rounded-[45%] bg-[radial-gradient(ellipse_at_50%_42%,color-mix(in_srgb,var(--omjep-mauve)_34%,transparent),transparent_68%)] blur-3xl motion-reduce:blur-xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[-6%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_35%,color-mix(in_srgb,var(--omjep-gold)_16%,transparent),transparent_62%)] blur-2xl"
          aria-hidden
        />
        <img
          src={heroVisualUrl}
          alt="Visuel officiel Palmarès OMJEP"
          className="relative z-[1] max-h-[min(52vh,440px)] w-full object-contain drop-shadow-[0_28px_64px_rgba(0,0,0,0.58)] motion-reduce:drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)]"
        />
      </div>
    )
  }
  return <HeroTrophyMonument />
}

function CompetitionTrophy({ type, imageUrl }: { type: 'league' | 'cup' | 'ucl'; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <div
        className="palmares-comp-trophy relative flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center sm:h-[8.25rem] sm:w-[8.25rem]"
        aria-hidden
      >
        <div className="pointer-events-none absolute inset-1 rounded-2xl bg-[radial-gradient(circle_at_50%_40%,color-mix(in_srgb,var(--omjep-gold)_22%,transparent),transparent_70%)] opacity-90" />
        <img src={imageUrl} alt="" className="relative z-[1] h-[90%] w-[90%] object-contain drop-shadow-[0_14px_36px_rgba(0,0,0,0.55)]" />
      </div>
    )
  }
  const uid = useId().replace(/:/g, '')
  const gid = `palmares-ct-${type}-${uid}`
  const isGold = type === 'cup'
  return (
    <div
      className="palmares-comp-trophy relative flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center sm:h-[8.25rem] sm:w-[8.25rem]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_40%_30%,color-mix(in_srgb,var(--omjep-gold)_18%,transparent),transparent_65%)] opacity-80" />
      <svg viewBox="0 0 140 150" className="relative z-[1] h-[88%] w-[88%] drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isGold ? '#fffbeb' : '#f5f3ff'} />
            <stop offset="45%" stopColor={isGold ? '#f59e0b' : '#8b5cf6'} />
            <stop offset="100%" stopColor={isGold ? '#78350f' : '#3b0764'} />
          </linearGradient>
          <linearGradient id={`${gid}-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="40%" stopColor="transparent" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <ellipse cx="70" cy="128" rx="42" ry="9" fill="rgba(0,0,0,0.4)" />
        {type === 'ucl' ? (
          <>
            <circle
              cx="70"
              cy="58"
              r="36"
              fill={`url(#${gid})`}
              stroke="color-mix(in srgb, var(--omjep-gold) 55%, transparent)"
              strokeWidth="2"
            />
            <path
              d="M70 26 L79 52 L106 52 L84 68 L93 94 L70 78 L47 94 L56 68 L34 52 L61 52 Z"
              fill="color-mix(in srgb, var(--omjep-gold) 28%, transparent)"
              stroke="color-mix(in srgb, var(--omjep-gold) 75%, transparent)"
              strokeWidth="1.3"
            />
            <ellipse cx="70" cy="52" rx="22" ry="10" fill={`url(#${gid}-shine)`} opacity="0.5" />
            <circle cx="70" cy="132" r="5" fill="color-mix(in srgb, var(--omjep-mauve) 90%, #000)" />
          </>
        ) : type === 'cup' ? (
          <>
            <path
              d="M38 44h64v15c0 34 17 58 44 66v12H34v-12c27-8 44-32 44-66V44z"
              fill={`url(#${gid})`}
              stroke="color-mix(in srgb, var(--omjep-gold) 72%, transparent)"
              strokeWidth="2"
            />
            <rect
              x="50"
              y="26"
              width="40"
              height="26"
              rx="6"
              fill="color-mix(in srgb, var(--omjep-bg-panel) 30%, transparent)"
              stroke="color-mix(in srgb, var(--omjep-gold) 58%, transparent)"
              strokeWidth="1.5"
            />
            <path d="M52 124h36v20H52z" fill="color-mix(in srgb, var(--omjep-mauve) 90%, #000)" />
            <path d="M44 52h52v6H44z" fill={`url(#${gid}-shine)`} opacity="0.45" />
          </>
        ) : (
          <>
            <path
              d="M46 48h48v12c0 28-14 48-32 56v14H78v-14c-18-8-32-28-32-56V48z"
              fill={`url(#${gid})`}
              stroke="color-mix(in srgb, var(--omjep-mauve) 58%, transparent)"
              strokeWidth="2"
            />
            <rect
              x="54"
              y="32"
              width="32"
              height="20"
              rx="5"
              fill="color-mix(in srgb, var(--omjep-bg-panel) 38%, transparent)"
              stroke="color-mix(in srgb, var(--omjep-gold) 48%, transparent)"
              strokeWidth="1.5"
            />
            <path d="M58 118h24v16H58z" fill="color-mix(in srgb, var(--omjep-mauve) 90%, #000)" />
            <path d="M50 46h40v5H50z" fill={`url(#${gid}-shine)`} opacity="0.4" />
          </>
        )}
      </svg>
    </div>
  )
}

function ClubCrest({ initials, imageUrl }: { initials: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <div className="mx-auto h-[3.75rem] w-[3.75rem] overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_48%,var(--omjep-border))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_-8px_color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)] sm:h-16 sm:w-16">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className="mx-auto flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_48%,var(--omjep-border))] bg-gradient-to-br from-[color-mix(in_srgb,var(--omjep-mauve)_28%,#0c1020)] to-[#060912] font-heading text-base font-black text-[color-mix(in_srgb,var(--omjep-gold)_90%,#fff)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_24px_-8px_color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)] sm:h-16 sm:w-16 sm:text-lg">
      {initials}
    </div>
  )
}

const panel =
  'palmares-glass-panel rounded-2xl border border-[color-mix(in_srgb,var(--omjep-border)_55%,var(--omjep-mauve)_18%)] bg-[color-mix(in_srgb,var(--omjep-bg-panel)_88%,#050810)] shadow-[var(--omjep-shadow-lg)] ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_40%,transparent)] backdrop-blur-xl dark:bg-[color-mix(in_srgb,var(--omjep-bg-panel)_82%,#03050c)]'

const compCardBase =
  `palmares-trophy-card palmares-comp-card-hover group relative flex h-full min-h-0 flex-col overflow-hidden transition-[transform,box-shadow] duration-300 motion-reduce:transition-none md:flex-row`

export default function PalmaresPage() {
  const reduce = useReducedMotion()
  const { data: landingMedia } = useQuery({
    queryKey: ['public-landing-media'],
    queryFn: async () => {
      const { data } = await api.get<PublicLandingMediaPayload>('/public/landing-media')
      return data
    },
    staleTime: 60_000,
    retry: 1,
  })
  const d = buildPalmaresViewModel(landingMedia)

  return (
    <div className="palmares-root relative min-w-0 overflow-x-hidden pb-8" data-palmares-page="1">
      <div className="pointer-events-none absolute inset-0 -z-10 palmares-hero-ambient" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10 palmares-hero-particles" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--omjep-gold)_35%,transparent)] to-transparent opacity-[0.35] lg:block" aria-hidden />

      <header className="relative mx-auto max-w-6xl px-4 pb-4 pt-16 sm:px-6 sm:pb-5 sm:pt-[4.25rem] lg:px-8 lg:pb-6 lg:pt-[4.5rem]">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10">
          <motion.div
            className="text-center lg:text-left"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_42%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel-soft))] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-omjep-text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-mauve))]" aria-hidden />
              Prestige & héritage
            </span>
            <h1 className="mt-3 font-heading text-[2rem] font-black leading-[1.06] tracking-tight text-omjep-text-primary sm:text-4xl lg:mt-4 lg:text-[2.65rem]">
              Palmarès Officiel{' '}
              <span className="bg-gradient-to-r from-[color-mix(in_srgb,var(--omjep-gold)_92%,#fff)] via-omjep-mauve to-[color-mix(in_srgb,var(--omjep-mauve)_88%,var(--omjep-gold))] bg-clip-text text-transparent">
                OMJEP
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-omjep-text-secondary sm:text-base lg:mx-0 lg:mt-4">
              Découvrez les trophées officiels, les champions et les moments d’exception qui façonnent la scène marocaine
              Pro Clubs EA FC.
            </p>

            <ul className="mx-auto mt-5 flex max-w-xl flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5 sm:gap-y-1.5 lg:mx-0 lg:justify-start">
              <li className="flex items-center justify-center gap-2 text-sm text-omjep-text-secondary lg:justify-start">
                <Trophy className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--omjep-gold)_78%,var(--omjep-mauve))]" aria-hidden />
                <span>
                  <span className="font-heading font-black tabular-nums text-omjep-text-primary">{d.stats.competitions}</span>{' '}
                  compétitions officielles
                </span>
              </li>
              <li className="hidden h-4 w-px bg-omjep-border/60 sm:block" aria-hidden />
              <li className="flex items-center justify-center gap-2 text-sm text-omjep-text-secondary lg:justify-start">
                <Award className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--omjep-gold)_78%,var(--omjep-mauve))]" aria-hidden />
                <span>
                  <span className="font-heading font-black tabular-nums text-omjep-text-primary">{d.stats.saisons}</span>{' '}
                  saisons disputées
                </span>
              </li>
              <li className="hidden h-4 w-px bg-omjep-border/60 sm:block" aria-hidden />
              <li className="flex items-center justify-center gap-2 text-sm text-omjep-text-secondary lg:justify-start">
                <Crown className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--omjep-gold)_78%,var(--omjep-mauve))]" aria-hidden />
                <span>
                  <span className="font-heading font-black tabular-nums text-omjep-text-primary">{d.stats.champions}</span>{' '}
                  champions sacrés
                </span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={reduce ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.52, delay: reduce ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroTrophyVisual heroVisualUrl={d.heroVisualUrl} />
          </motion.div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-2 pt-0 sm:px-6 lg:px-8" aria-labelledby="palmares-comp-title">
        <h2 id="palmares-comp-title" className="sr-only">
          Compétitions officielles OMJEP
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {d.competitions.map((c, i) => (
            <FadeBlock key={c.id} delay={i * 0.05}>
              <article className={`${compCardBase} palmares-comp-card--${c.trophy === 'cup' ? 'gold' : 'mauve'} relative overflow-hidden`}>
                {c.cardImageUrl ? (
                  <>
                    <img
                      src={c.cardImageUrl}
                      alt=""
                      className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-[0.14]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[color-mix(in_srgb,var(--omjep-bg-panel)_96%,#03060c)] via-transparent to-[color-mix(in_srgb,#050a14_92%,transparent)]"
                      aria-hidden
                    />
                  </>
                ) : null}
                <div className="relative z-[2] flex h-full min-h-0 flex-col md:flex-row">
                <div className="flex flex-shrink-0 items-center justify-center border-b border-[color-mix(in_srgb,var(--omjep-border)_50%,transparent)] py-4 md:w-[9.5rem] md:border-b-0 md:border-r md:py-5 md:pl-1 md:pr-0">
                  <CompetitionTrophy type={c.trophy} imageUrl={c.trophyImageUrl} />
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-4 pb-3 sm:p-5 sm:pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--omjep-mauve)_92%,var(--omjep-text-muted))]">
                      {c.label}
                    </p>
                    <span className="rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_90%,#0a0f1a)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--omjep-gold)_82%,var(--omjep-text-secondary))]">
                      {c.badge}
                    </span>
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-bold leading-tight text-omjep-text-primary sm:text-xl">
                    {c.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-omjep-text-secondary">{c.desc}</p>
                  <div className="mt-4 border-t border-[color-mix(in_srgb,var(--omjep-border)_45%,transparent)] pt-4">
                    <Link
                      to="/register"
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_55%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_8%,var(--omjep-bg-panel))] py-2.5 text-sm font-semibold text-omjep-text-primary shadow-[0_0_20px_-6px_color-mix(in_srgb,var(--omjep-gold)_28%,transparent)] transition hover:border-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-border))] hover:bg-[color-mix(in_srgb,var(--omjep-gold)_14%,var(--omjep-bg-panel-soft))]"
                    >
                      Voir le palmarès
                      <ChevronRight className="h-4 w-4 opacity-85" aria-hidden />
                    </Link>
                  </div>
                </div>
                </div>
              </article>
            </FadeBlock>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12" aria-labelledby="palmares-champions-heading">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,288px)] lg:items-stretch lg:gap-6">
          <FadeBlock>
            <div className={`${panel} palmares-champions-panel flex min-h-full flex-col p-5 sm:p-6 lg:p-7`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <h2
                    id="palmares-champions-heading"
                    className="font-heading text-xl font-black tracking-tight text-omjep-text-primary sm:text-2xl lg:text-[1.65rem]"
                  >
                    Hall des champions
                  </h2>
                  <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-omjep-text-secondary sm:text-sm">
                    Champions récents inscrits au palmarès officiel OMJEP.
                  </p>
                </div>
                <Link
                  to="/register"
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_48%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-omjep-text-primary transition hover:brightness-110"
                >
                  Voir tous les champions
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-4">
                {d.championsRecent.map((ch) => (
                  <div
                    key={ch.mediaKey}
                    className="palmares-champion-tile rounded-xl border border-[color-mix(in_srgb,var(--omjep-border)_55%,var(--omjep-mauve)_12%)] bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_82%,#050a14)] p-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4"
                  >
                    <ClubCrest initials={ch.initials} imageUrl={ch.badgeImageUrl} />
                    <p className="mt-3 font-heading text-sm font-bold text-omjep-text-primary">{ch.club}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-omjep-text-muted">{ch.comp}</p>
                    <span className="mt-2.5 inline-block rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]">
                      {ch.status}
                    </span>
                    <p className="mt-2 text-xs text-omjep-text-secondary">{ch.saison}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeBlock>

          <FadeBlock delay={0.06}>
            <aside className={`${panel} palmares-records-aside flex h-full flex-col p-5 sm:p-6`} aria-labelledby="palmares-records-heading">
              <div className="flex items-start gap-3 border-b border-[color-mix(in_srgb,var(--omjep-border)_50%,transparent)] pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel-soft))]">
                  <Award className="h-5 w-5 text-[color-mix(in_srgb,var(--omjep-gold)_80%,var(--omjep-mauve))]" aria-hidden />
                </div>
                <div>
                  <h2 id="palmares-records-heading" className="font-heading text-base font-black text-omjep-text-primary sm:text-lg">
                    Records & Leaders
                  </h2>
                  <p className="mt-0.5 text-[11px] text-omjep-text-muted">Saison de référence · données vitrine cohérentes</p>
                </div>
              </div>
              <ul className="mt-4 flex flex-1 flex-col">
                {d.records.map((r, idx) => (
                  <li
                    key={r.label}
                    className={`flex flex-col gap-0.5 py-3.5 ${idx > 0 ? 'border-t border-[color-mix(in_srgb,var(--omjep-border)_45%,transparent)]' : ''}`}
                  >
                    <p className="text-[10px] font-bold uppercase leading-snug tracking-wide text-omjep-text-muted">{r.label}</p>
                    <p className="font-heading text-base font-bold text-omjep-text-primary">{r.holder}</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-heading text-2xl font-black tabular-nums text-[color-mix(in_srgb,var(--omjep-gold)_92%,var(--omjep-mauve))]">
                        {r.value}
                      </span>
                      <span className="text-sm font-medium text-omjep-text-secondary">{r.valueSuffix}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </FadeBlock>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-12 pt-1 text-center sm:px-6 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-omjep-text-muted">
          OMJEP · Organisation Marocaine des Jeux Électroniques Professionnels
        </p>
      </footer>
    </div>
  )
}
