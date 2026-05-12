import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronRight,
  CircleDot,
  Coins,
  Gamepad2,
  LayoutDashboard,
  Radio,
  Shield,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'

/** Visuels gaming locaux — déposer les fichiers dans `public/images/gaming/`. */
export const gameVisuals = [
  { title: 'Compétition', src: '/images/gaming/competition.png' },
  { title: 'Clubs', src: '/images/gaming/clubs.png' },
  { title: 'Arène', src: '/images/gaming/arena.png' },
  { title: 'Setup', src: '/images/gaming/setup.png' },
  { title: 'Trophée', src: '/images/gaming/trophy.png' },
  { title: 'Joueurs pro', src: '/images/gaming/hero.png' },
  { title: 'Manette', src: '/images/gaming/controller.png' },
] as const

const surfaceCard =
  'rounded-2xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_88%,var(--omjep-bg-elevated))] shadow-[var(--omjep-shadow-md)] backdrop-blur-xl ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_45%,transparent)] sm:dark:bg-[color-mix(in_srgb,var(--omjep-bg-panel)_82%,#06040c)] dark:shadow-[var(--omjep-shadow-lg)]'

const SectionShell = ({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  subtitle?: string
  children: ReactNode
}) => {
  const reduce = useReducedMotion()
  return (
    <motion.section
      id={id}
      className="join-omjep-section mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '-40px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="font-heading text-[10px] font-extrabold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-text-muted))]">
        {eyebrow}
      </p>
      <h2 className="mt-2 max-w-3xl font-heading text-2xl font-black tracking-tight text-omjep-text-primary sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-omjep-text-secondary sm:text-base">{subtitle}</p>
      ) : null}
      <div className="mt-10">{children}</div>
    </motion.section>
  )
}

const badgePill =
  'inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel-soft))] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-omjep-text-primary'

const premiumFallback =
  'absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--omjep-mauve)_45%,#0a0614),#050308_55%,#020105)]'

const VisualCard = ({
  title,
  src,
  tilt,
  delay,
}: {
  title: string
  src: string
  tilt: number
  delay: number
}) => {
  const reduce = useReducedMotion()
  const [broken, setBroken] = useState(false)
  const handleError = useCallback(() => setBroken(true), [])

  return (
    <motion.figure
      className="group relative aspect-[4/5] w-[min(100%,220px)] shrink-0 snap-center sm:w-[200px] lg:w-[220px]"
      initial={reduce ? false : { opacity: 0, y: 24, rotate: tilt * 0.4 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        className="relative h-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--omjep-gold)_28%,var(--omjep-border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--omjep-mauve)_20%,transparent)] transition duration-300 motion-safe:group-hover:scale-[1.04] motion-safe:group-hover:shadow-[0_0_32px_color-mix(in_srgb,var(--omjep-mauve)_35%,transparent),0_0_0_1px_color-mix(in_srgb,var(--omjep-gold)_40%,transparent)]"
        style={{ transform: `rotateY(${tilt * 0.8}deg)` }}
      >
        {broken ? <div className={premiumFallback} aria-hidden /> : null}
        {!broken ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={handleError}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#030208] via-[#030208]/55 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[color-mix(in_srgb,var(--omjep-mauve)_25%,transparent)] transition group-hover:opacity-55" aria-hidden />
        <figcaption className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-heading text-xs font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {title}
          </p>
        </figcaption>
      </div>
    </motion.figure>
  )
}

const SkeletonBar = ({ className = '' }: { className?: string }) => (
  <div
    className={`h-2.5 rounded-md bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,var(--omjep-bg-panel-soft))] ${className}`}
    aria-hidden
  />
)

export default function JoinOmjepPage() {
  const reduce = useReducedMotion()

  const heroBadges = ['Clubs Pro', 'Compétitions officielles', 'Classements live', 'Marché des joueurs']

  const whyCards = [
    {
      title: 'Compétitions organisées',
      body: 'Formats homologués, calendriers structurés et arbitrage aligné sur une scène e-sport professionnelle.',
      icon: Shield,
    },
    {
      title: 'Clubs & managers',
      body: 'Outils de gestion d’effectif, staff et identité club pour piloter une saison complète sur OMJEP.',
      icon: Building2,
    },
    {
      title: 'Classement officiel',
      body: 'Un classement unique et traçable : chaque résultat compte dans la progression collective et individuelle.',
      icon: BarChart3,
    },
    {
      title: 'Économie virtuelle OC / JPY',
      body: 'Monnaies plateforme pour récompenser l’engagement et alimenter le marché des joueurs de manière cohérente.',
      icon: Coins,
    },
  ]

  const experienceSteps = [
    { title: 'Créer son profil', desc: 'Identité joueur, plateforme et préférences compétition.', icon: UserPlus },
    { title: 'Rejoindre un club', desc: 'Candidature, essai ou rattachement à un roster OMJEP.', icon: Users },
    { title: 'Participer aux compétitions', desc: 'Ligues, coupes et phases finales suivies sur la plateforme.', icon: Trophy },
    { title: 'Reporter les résultats', desc: 'Workflow officiel pour valider les scores et la feuille de match.', icon: Radio },
    { title: 'Monter au classement', desc: 'Progression visible dans les standings nationaux et circuits.', icon: Zap },
  ]

  const competitionCards = [
    {
      name: 'Ligue OMJEP',
      blurb: 'Saison longue, rythme régulier et titre national.',
      tone: 'gold' as const,
      href: '/register',
    },
    {
      name: 'Coupe du Trône eSport',
      blurb: 'Knockout intense, moments décisifs et prestige royal.',
      tone: 'copper' as const,
      href: '/register',
    },
    {
      name: 'Champions League',
      blurb: 'Sommet continental réservé aux meilleurs clubs OMJEP.',
      tone: 'violet' as const,
      href: '/register',
    },
  ]

  const tilts = [-5, 4, -3, 5, -4, 3, -3.5]

  return (
    <div className="join-omjep-root relative min-w-0 overflow-x-hidden pb-8" data-join-omjep="1">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.72] dark:opacity-[0.58]"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 55% at 12% -8%, color-mix(in srgb, var(--omjep-mauve) 26%, transparent), transparent 52%),
              radial-gradient(ellipse 55% 45% at 92% 12%, color-mix(in srgb, var(--omjep-gold) 16%, transparent), transparent 48%),
              radial-gradient(ellipse 50% 42% at 50% 100%, color-mix(in srgb, var(--omjep-mauve) 12%, transparent), transparent 55%)
            `,
          }}
        />
        <div className="join-omjep-grid-fade absolute inset-0 opacity-[0.4] dark:opacity-[0.26]" aria-hidden />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden" aria-hidden>
        {[...Array(18)].map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[color-mix(in_srgb,var(--omjep-mauve)_70%,white)] opacity-40 shadow-[0_0_12px_color-mix(in_srgb,var(--omjep-mauve)_80%,transparent)] motion-safe:animate-pulse"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              animationDelay: `${i * 0.35}s`,
            }}
          />
        ))}
      </div>

      {/* —— Hero —— */}
      <header className="relative flex min-h-[min(92vh,900px)] flex-col justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/gaming/hero.png"
            alt=""
            className="h-full w-full object-cover object-center opacity-90"
            loading="eager"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#030212]/95 via-[#05031a]/88 to-[#07051f]/75"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#020105] via-transparent to-[color-mix(in_srgb,var(--omjep-mauve)_18%,transparent)]"
            aria-hidden
          />
          <div className="join-omjep-grid-fade absolute inset-0 opacity-30" aria-hidden />
          <div
            className="absolute left-0 top-1/4 h-px w-[55%] bg-gradient-to-r from-[color-mix(in_srgb,var(--omjep-gold)_55%,transparent)] to-transparent blur-[1px]"
            aria-hidden
          />
          <div
            className="absolute bottom-1/3 right-0 h-px w-[40%] bg-gradient-to-l from-[color-mix(in_srgb,var(--omjep-mauve)_50%,transparent)] to-transparent"
            aria-hidden
          />
        </div>

        <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8">
          <motion.div
            className="flex flex-wrap items-center gap-4"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="font-heading text-2xl font-black tracking-tight text-white sm:text-3xl">
              <span className="bg-gradient-to-r from-white via-white to-[color-mix(in_srgb,var(--omjep-mauve)_85%,white)] bg-clip-text text-transparent">
                OMJEP
              </span>
            </span>
            <span className="hidden h-6 w-px bg-white/25 sm:block" aria-hidden />
            <p className="max-w-md text-[10px] font-bold uppercase leading-relaxed tracking-[0.2em] text-white/70">
              Organisation Marocaine des Jeux Électroniques Professionnels
            </p>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: reduce ? 0 : 0.06 }}
            className="max-w-3xl"
          >
            <h1 className="font-heading text-4xl font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]">
              La plateforme marocaine des compétitions e-sport professionnelles
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-[color-mix(in_srgb,white_88%,var(--omjep-mauve))] sm:text-lg">
              Créez votre club, rejoignez des compétitions, suivez les classements et vivez l’expérience OMJEP.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-2"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.14 }}
          >
            {heroBadges.map((label) => (
              <span key={label} className={badgePill}>
                <Sparkles className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_90%,var(--omjep-mauve))]" aria-hidden />
                {label}
              </span>
            ))}
          </motion.div>

          <motion.div
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduce ? 0 : 0.2 }}
          >
            <Link
              to="/register"
              className="omjep-btn-primary inline-flex min-h-[52px] items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold normal-case tracking-normal shadow-[0_0_28px_color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)]"
            >
              Rejoindre OMJEP
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-[color-mix(in_srgb,#0c0820_75%,transparent)] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_45%,white)] hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_18%,#0c0820)]"
            >
              Voir les compétitions
              <ChevronRight className="h-4 w-4 opacity-80" aria-hidden />
            </Link>
          </motion.div>
        </div>
      </header>

      {/* —— Visual wall —— */}
      <section
        className="relative border-y border-[color-mix(in_srgb,var(--omjep-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--omjep-bg-panel)_55%,#03010a)] py-12 sm:py-16"
        aria-labelledby="join-visual-wall-heading"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--omjep-mauve)_12%,transparent),transparent_60%)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 id="join-visual-wall-heading" className="font-heading text-lg font-black text-omjep-text-primary sm:text-xl">
            Ambiances compétition
          </h2>
          <p className="mt-2 max-w-xl text-sm text-omjep-text-secondary">
            Un mur visuel inspiré de l’arène, du club et du setup pro — même énergie que les grands broadcasts e-sport.
          </p>
          <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden">
            {gameVisuals.map((v, i) => (
              <VisualCard key={v.title} title={v.title} src={v.src} tilt={tilts[i] ?? 0} delay={i * 0.06} />
            ))}
          </div>
        </div>
      </section>

      {/* —— Pourquoi OMJEP —— */}
      <SectionShell
        id="pourquoi"
        eyebrow="Pourquoi OMJEP"
        title="Une plateforme pensée pour la performance"
        subtitle="Structure, lisibilité et prestige : les piliers d’une expérience compétition sérieuse."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyCards.map(({ title, body, icon: Icon }, i) => (
            <motion.article
              key={title}
              className={`${surfaceCard} flex flex-col gap-3 p-5 transition motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_0_24px_color-mix(in_srgb,var(--omjep-mauve)_22%,transparent)]`}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: reduce ? 0 : i * 0.06, duration: 0.45 }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_12%,var(--omjep-bg-panel-soft))] text-omjep-mauve shadow-[0_0_16px_color-mix(in_srgb,var(--omjep-mauve)_25%,transparent)]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-heading text-base font-bold text-omjep-text-primary">{title}</h3>
              <p className="text-sm leading-relaxed text-omjep-text-secondary">{body}</p>
            </motion.article>
          ))}
        </div>
      </SectionShell>

      {/* —— Expérience compétition —— */}
      <section className="relative border-t border-omjep-border/40 bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_40%,transparent)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="font-heading text-[10px] font-extrabold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--omjep-gold)_75%,var(--omjep-text-muted))]">
            Expérience compétition
          </p>
          <h2 className="mt-2 font-heading text-2xl font-black tracking-tight text-omjep-text-primary sm:text-3xl">
            De l’inscription au sommet du classement
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-omjep-text-secondary sm:text-base">
            Parcours linéaire, état actif visuel et repères clairs — comme un flux HUD sur le terrain.
          </p>

          <div className="relative mt-12 lg:mt-14">
            <div
              className="pointer-events-none absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--omjep-mauve)_55%,transparent)] to-transparent lg:left-0 lg:right-0 lg:top-10 lg:bottom-auto lg:mx-auto lg:h-0.5 lg:w-[min(100%,880px)] lg:bg-gradient-to-r lg:from-transparent lg:via-[color-mix(in_srgb,var(--omjep-mauve)_50%,var(--omjep-gold))] lg:to-transparent"
              aria-hidden
            />

            <ol className="relative grid gap-6 lg:grid-cols-5 lg:gap-3">
              {experienceSteps.map((step, i) => {
                const Icon = step.icon
                const active = i === 2
                return (
                  <motion.li
                    key={step.title}
                    className={`relative ${surfaceCard} flex gap-4 p-4 lg:flex-col lg:items-center lg:text-center`}
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ delay: reduce ? 0 : i * 0.07, duration: 0.45 }}
                  >
                    <span
                      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-heading text-xs font-black ${
                        active
                          ? 'border-[color-mix(in_srgb,var(--omjep-mauve)_85%,var(--omjep-gold))] bg-[color-mix(in_srgb,var(--omjep-mauve)_22%,var(--omjep-bg-panel))] text-white shadow-[0_0_20px_color-mix(in_srgb,var(--omjep-mauve)_45%,transparent)]'
                          : 'border-omjep-border/80 bg-omjep-bg-panel-soft text-omjep-text-muted'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-[color-mix(in_srgb,var(--omjep-gold)_90%,white)]' : ''}`} aria-hidden />
                      {active ? (
                        <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-[color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)] motion-reduce:hidden" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1 pl-2 lg:w-full lg:pl-0">
                      <p className="font-heading text-[10px] font-black uppercase tracking-widest text-omjep-text-muted">
                        Étape {i + 1}
                      </p>
                      <h3 className="mt-1 font-heading text-sm font-bold text-omjep-text-primary">{step.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-omjep-text-secondary">{step.desc}</p>
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* —— Live cockpit (preview UI only) —— */}
      <SectionShell
        id="cockpit"
        eyebrow="Live cockpit"
        title="Aperçu de l’interface compétition"
        subtitle="Représentation stylisée des modules OMJEP — sans données live ni chiffres fictifs."
      >
        <div className={`${surfaceCard} overflow-hidden p-0`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel-soft))] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 text-omjep-text-primary">
              <LayoutDashboard className="h-4 w-4 text-omjep-mauve" aria-hidden />
              <span className="font-heading text-xs font-bold uppercase tracking-wider">Aperçu cockpit compétition</span>
            </div>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,transparent)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]">
              Maquette UI
            </span>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            {[
              { label: 'Matchs en cours', icon: CircleDot },
              { label: 'Clubs inscrits', icon: Building2 },
              { label: 'Classement live', icon: BarChart3 },
              { label: 'Activité mercato', icon: Gamepad2 },
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/80 p-4 ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_50%,transparent)]"
              >
                <div className="flex items-center gap-2 text-omjep-text-primary">
                  <Icon className="h-4 w-4 shrink-0 text-omjep-mauve" aria-hidden />
                  <p className="text-xs font-bold uppercase tracking-wide text-omjep-text-secondary">{label}</p>
                </div>
                <div className="mt-4 space-y-2">
                  <SkeletonBar className="w-3/4" />
                  <SkeletonBar className="w-full opacity-80" />
                  <SkeletonBar className="w-5/6 opacity-60" />
                </div>
                <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-omjep-text-muted">
                  Contenu chargé après connexion
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      {/* —— Compétitions —— */}
      <SectionShell
        id="competitions"
        eyebrow="Compétitions"
        title="Trois vitrines majeures"
        subtitle="Identités visuelles distinctes pour chaque format — même exigence de qualité."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {competitionCards.map((c, i) => {
            const ring =
              c.tone === 'gold'
                ? 'border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--omjep-gold)_18%,transparent),0_0_0_1px_color-mix(in_srgb,var(--omjep-gold)_12%,transparent)]'
                : c.tone === 'copper'
                  ? 'border-[color-mix(in_srgb,#b45309_50%,var(--omjep-border))] shadow-[inset_0_1px_0_color-mix(in_srgb,#f97316_12%,transparent)]'
                  : 'border-[color-mix(in_srgb,var(--omjep-mauve)_50%,#1e3a8a)] shadow-[0_0_24px_color-mix(in_srgb,var(--omjep-mauve)_18%,transparent)]'
            const chip =
              c.tone === 'gold'
                ? 'bg-[color-mix(in_srgb,var(--omjep-gold)_14%,transparent)] text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]'
                : c.tone === 'copper'
                  ? 'bg-[color-mix(in_srgb,#ea580c_14%,transparent)] text-orange-100'
                  : 'bg-[color-mix(in_srgb,var(--omjep-mauve)_16%,#1e1b4b)] text-indigo-100'
            return (
              <motion.article
                key={c.name}
                className={`${surfaceCard} flex flex-col gap-4 p-6 ${ring}`}
                initial={reduce ? false : { opacity: 0, y: 22 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: reduce ? 0 : i * 0.08, duration: 0.5 }}
              >
                <span className={`w-fit rounded-full border border-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest ${chip}`}>
                  {c.tone === 'gold' ? 'Or OMJEP' : c.tone === 'copper' ? 'Feu & cuivre' : 'Violet & bleu nuit'}
                </span>
                <h3 className="font-heading text-xl font-black text-omjep-text-primary">{c.name}</h3>
                <p className="flex-1 text-sm leading-relaxed text-omjep-text-secondary">{c.blurb}</p>
                <Link
                  to={c.href}
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/90 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))]"
                >
                  Découvrir
                  <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
                </Link>
              </motion.article>
            )
          })}
        </div>
      </SectionShell>

      {/* —— Final CTA —— */}
      <section className="join-omjep-cta mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] shadow-[var(--omjep-shadow-lg)]"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
        >
          <img
            src="/images/gaming/trophy.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#03010a]/96 via-[#08051c]/92 to-[#120a28]/88" aria-hidden />
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--omjep-mauve)_15%,transparent)] mix-blend-soft-light" aria-hidden />
          <div className="join-omjep-cta-shine pointer-events-none absolute inset-0 opacity-40 motion-reduce:opacity-22" aria-hidden />

          <div className="relative px-6 py-12 text-center sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <h2 className="font-heading text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              Prêt à entrer dans l’arène OMJEP ?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
              Créez votre compte pour accéder aux compétitions, au club et au marché des joueurs sur la plateforme officielle.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/register"
                className="omjep-btn-primary inline-flex min-h-[50px] min-w-[200px] items-center justify-center px-7 py-3.5 text-sm font-semibold normal-case tracking-normal"
              >
                Créer mon compte
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-[50px] min-w-[200px] items-center justify-center rounded-xl border border-white/25 bg-[color-mix(in_srgb,#0a0618_82%,transparent)] px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:border-white/45 hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_25%,#0a0618)]"
              >
                Connexion
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
