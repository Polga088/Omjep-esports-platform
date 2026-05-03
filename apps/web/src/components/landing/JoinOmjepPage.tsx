import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ChevronRight,
  Crown,
  Gamepad2,
  Medal,
  MessageCircle,
  Radio,
  Shield,
  Sparkles,
  Star,
  Target,
  PlayCircle,
  Trophy,
  Tv,
  Users,
  Zap,
} from 'lucide-react'

const surfaceCard =
  'rounded-2xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_94%,var(--omjep-bg-elevated))] p-5 shadow-[var(--omjep-shadow-md)] backdrop-blur-xl ring-1 ring-[color-mix(in_srgb,var(--omjep-border)_45%,transparent)] sm:p-6 dark:bg-[color-mix(in_srgb,var(--omjep-bg-panel)_88%,#06040c)] dark:shadow-[var(--omjep-shadow-lg)]'

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

const chipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--omjep-mauve)_30%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_8%,var(--omjep-bg-panel-soft))] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-omjep-text-primary'

export default function JoinOmjepPage() {
  const reduce = useReducedMotion()

  const heroChips = [
    { label: 'League OMJEP', icon: Trophy },
    { label: 'Coupe nationale', icon: Medal },
    { label: 'UCL Pro Clubs', icon: Star },
    { label: 'Joueur du mois', icon: Sparkles },
  ]

  const whyCards = [
    {
      title: 'Compétitions officielles',
      body: 'Calendriers homologués, résultats centralisés et règlement aligné sur la scène EA FC Pro Clubs.',
      icon: Shield,
    },
    {
      title: 'Identité joueur',
      body: 'Profil public premium : stats, poste, historique et visibilité auprès des clubs engagés.',
      icon: Target,
    },
    {
      title: 'Club & mercato',
      body: 'Rejoins un roster, passe en « disponible » ou attire l’œil des staffs en recherche de renforts.',
      icon: Users,
    },
    {
      title: 'Prestige & visibilité',
      body: 'Badges, palmarès et présence dans l’écosystème OMJEP — ta progression devient lisible.',
      icon: Zap,
    },
  ]

  const steps = [
    { n: '01', title: 'Créer son profil joueur', desc: 'Pseudo EA, plateforme, poste, niveau — la base pour être pris au sérieux.' },
    { n: '02', title: 'Rejoindre un club ou se rendre disponible', desc: 'Candidature, essais ou statut ouvert aux recruteurs OMJEP.' },
    { n: '03', title: 'Participer aux compétitions', desc: 'League, coupes, phases finales : tout est tracé sur la plateforme.' },
    { n: '04', title: 'Badges, réputation & récompenses', desc: 'Performances reconnues, progression visible, objectifs saisonniers.' },
  ]

  const highlights = [
    { title: 'League', tag: 'Saison longue', tone: 'mauve' as const },
    { title: 'Coupe', tag: 'Knockout', tone: 'gold' as const },
    { title: 'UCL', tag: 'Elite', tone: 'mauve' as const },
    { title: 'Joueur de la semaine', tag: 'Spotlight', tone: 'gold' as const },
  ]

  return (
    <div className="join-omjep-root relative min-w-0 overflow-x-hidden pb-8" data-join-omjep="1">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.65] dark:opacity-50"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 55% at 10% -10%, color-mix(in srgb, var(--omjep-mauve) 22%, transparent), transparent 52%),
              radial-gradient(ellipse 60% 50% at 95% 15%, color-mix(in srgb, var(--omjep-gold) 14%, transparent), transparent 48%),
              radial-gradient(ellipse 50% 40% at 50% 100%, color-mix(in srgb, var(--omjep-mauve) 10%, transparent), transparent 55%)
            `,
          }}
        />
        <div className="join-omjep-grid-fade absolute inset-0 opacity-[0.35] dark:opacity-[0.22]" aria-hidden />
      </div>

      {/* Hero */}
      <header className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8 lg:pb-28 lg:pt-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
          <div>
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--omjep-border-gold)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_10%,var(--omjep-bg-panel-soft))] px-3 py-1.5"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-text-secondary">
                Recrutement joueurs · EA FC Pro Clubs
              </span>
            </motion.div>

            <motion.h1
              className="mt-6 font-heading text-4xl font-black leading-[1.05] tracking-tight text-omjep-text-primary sm:text-5xl lg:text-6xl"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.06 }}
            >
              Rejoins{' '}
              <span className="bg-gradient-to-r from-omjep-mauve via-[color-mix(in_srgb,var(--omjep-mauve)_70%,var(--omjep-gold))] to-[color-mix(in_srgb,var(--omjep-gold)_85%,var(--omjep-mauve))] bg-clip-text text-transparent">
                OMJEP
              </span>
              <br />
              <span className="text-omjep-text-primary">l’arène Pro Clubs</span>
            </motion.h1>

            <motion.p
              className="mt-5 max-w-xl text-base leading-relaxed text-omjep-text-secondary sm:text-lg"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : 0.12 }}
            >
              La plateforme officielle pour jouer, progresser et briller dans les compétitions EA FC Pro Clubs au
              Maroc — profil, clubs, mercato et visibilité au même endroit.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: reduce ? 0 : 0.18 }}
            >
              <Link
                to="/register"
                className="omjep-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold normal-case tracking-normal"
              >
                Créer mon profil joueur
                <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              </Link>
              <Link
                to="/plateforme#live-matches"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-omjep-border/80 bg-omjep-bg-panel-soft/90 px-6 py-3.5 text-sm font-semibold text-omjep-text-primary shadow-sm transition hover:border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] hover:bg-[color-mix(in_srgb,var(--omjep-mauve)_6%,var(--omjep-bg-panel-soft))]"
              >
                Voir les compétitions
                <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
              </Link>
            </motion.div>
          </div>

          {/* Hero visual — floating chips + card stack */}
          <motion.div
            className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={reduce ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="join-omjep-hero-glow pointer-events-none absolute -inset-6 rounded-3xl blur-2xl motion-reduce:opacity-40" aria-hidden />
            <div className={`relative ${surfaceCard} p-6 sm:p-8`}>
              <div className="flex flex-wrap gap-2">
                {heroChips.map(({ label, icon: Icon }, i) => (
                  <motion.span
                    key={label}
                    className={chipClass}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: reduce ? 0 : 0.2 + i * 0.07, duration: 0.35 }}
                  >
                    <Icon className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--omjep-gold)_80%,var(--omjep-mauve))]" aria-hidden />
                    {label}
                  </motion.span>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--omjep-gold)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,var(--omjep-bg-panel))] shadow-[var(--omjep-glow-gold-soft)]">
                  <Crown className="h-8 w-8 text-[color-mix(in_srgb,var(--omjep-gold)_90%,var(--omjep-mauve))]" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-omjep-text-muted">Rang national</p>
                  <p className="font-heading text-2xl font-black text-omjep-text-primary">#12</p>
                  <p className="text-[11px] text-omjep-text-secondary">Aperçu — ton profil ici après inscription</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl border border-omjep-border/50 bg-omjep-bg-panel-soft/80 p-3">
                {[
                  { k: 'Win rate', v: '62%' },
                  { k: 'Buts / match', v: '1.4' },
                  { k: 'Clean sheets', v: '08' },
                ].map((s) => (
                  <div key={s.k} className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-omjep-text-muted">{s.k}</p>
                    <p className="mt-1 font-heading text-lg font-black text-omjep-text-primary">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Why join */}
      <SectionShell
        id="pourquoi"
        eyebrow="Pourquoi OMJEP"
        title="Quatre raisons de franchir la ligne"
        subtitle="Pas un simple tableau de scores : un parcours joueur pensé pour la compétition Pro Clubs."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyCards.map(({ title, body, icon: Icon }, i) => (
            <motion.article
              key={title}
              className={`${surfaceCard} flex flex-col gap-3 p-5 transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--omjep-shadow-lg)]`}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: reduce ? 0 : i * 0.06, duration: 0.45 }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,var(--omjep-bg-panel-soft))] text-omjep-mauve">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-heading text-base font-bold text-omjep-text-primary">{title}</h3>
              <p className="text-sm leading-relaxed text-omjep-text-secondary">{body}</p>
            </motion.article>
          ))}
        </div>
      </SectionShell>

      {/* How it works */}
      <SectionShell
        id="parcours"
        eyebrow="Parcours"
        title="Comment ça marche"
        subtitle="Quatre étapes claires — du profil à la reconnaissance en compétition."
      >
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.li
              key={step.n}
              className={`relative ${surfaceCard} overflow-hidden p-5`}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: reduce ? 0 : i * 0.08, duration: 0.45 }}
            >
              <span className="font-heading text-3xl font-black text-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))]">
                {step.n}
              </span>
              <h3 className="mt-3 font-heading text-sm font-bold text-omjep-text-primary">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-omjep-text-secondary">{step.desc}</p>
              {i < steps.length - 1 ? (
                <ChevronRight className="absolute right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-omjep-border lg:block" aria-hidden />
              ) : null}
            </motion.li>
          ))}
        </ol>
      </SectionShell>

      {/* Competition highlights */}
      <SectionShell
        id="formats"
        eyebrow="Formats"
        title="Compétitions qui comptent"
        subtitle="Des circuits variés pour tous les niveaux — avec une présentation digne d’un broadcast esport."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h, i) => (
            <motion.div
              key={h.title}
              className={`join-omjep-highlight join-omjep-highlight--${h.tone} ${surfaceCard} flex flex-col gap-3 p-5`}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: reduce ? 0 : i * 0.07, duration: 0.5 }}
            >
              <span
                className={
                  h.tone === 'gold'
                    ? 'w-fit rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-gold)_12%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[color-mix(in_srgb,var(--omjep-accent-gold)_95%,var(--omjep-text-primary))]'
                    : 'w-fit rounded-full border border-[color-mix(in_srgb,var(--omjep-mauve)_40%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_10%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-omjep-text-primary'
                }
              >
                {h.tag}
              </span>
              <p className="font-heading text-xl font-black text-omjep-text-primary">{h.title}</p>
              <p className="text-xs text-omjep-text-secondary">Saison OMJEP · homologué · suivi live</p>
            </motion.div>
          ))}
        </div>
      </SectionShell>

      {/* Player identity preview */}
      <SectionShell
        id="profil"
        eyebrow="Identité joueur"
        title="Ton profil, niveau showcase"
        subtitle="Un aperçu du type de fiche que les clubs et le staff voient sur OMJEP."
      >
        <motion.div
          className={`mx-auto max-w-3xl ${surfaceCard} overflow-hidden p-0 sm:p-0`}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.55 }}
        >
          <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
            <div className="border-b border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-mauve)_8%,var(--omjep-bg-panel-soft))] p-6 md:border-b-0 md:border-r">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-[color-mix(in_srgb,var(--omjep-gold)_50%,var(--omjep-mauve))] bg-gradient-to-br from-omjep-bg-panel to-omjep-bg-panel-soft font-heading text-2xl font-black text-omjep-mauve">
                  OM
                </div>
                <div className="min-w-0">
                  <p className="truncate font-heading text-xl font-black text-omjep-text-primary">OMJEP_ST · MC</p>
                  <p className="mt-1 text-sm text-omjep-text-secondary">Club : Eagles Rabat · Disponible mercato</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={chipClass}>
                      <Gamepad2 className="h-3.5 w-3.5" aria-hidden />
                      PS5
                    </span>
                    <span className={chipClass}>Maroc</span>
                    <span className={chipClass}>Pro Clubs Elite</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { l: 'Matchs', v: '128' },
                  { l: 'Buts', v: '94' },
                  { l: 'Passes D', v: '61' },
                  { l: 'Note moy.', v: '8.4' },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl border border-omjep-border/50 bg-omjep-bg-panel-soft/80 px-3 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-omjep-text-muted">{x.l}</p>
                    <p className="mt-0.5 font-heading text-lg font-black text-omjep-text-primary">{x.v}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-omjep-border/50 bg-omjep-bg-panel-soft/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-omjep-text-muted">Social & stream</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-omjep-border/60 px-2 py-1 text-[11px] font-medium text-omjep-text-secondary">Kick / OMJEP</span>
                  <span className="rounded-lg border border-omjep-border/60 px-2 py-1 text-[11px] font-medium text-omjep-text-secondary">YouTube highlights</span>
                  <span className="rounded-lg border border-omjep-border/60 px-2 py-1 text-[11px] font-medium text-omjep-text-secondary">Discord club</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </SectionShell>

      {/* Why clubs need you */}
      <SectionShell
        id="clubs"
        eyebrow="Recrutement"
        title="Les clubs ont besoin de toi"
        subtitle="OMJEP connecte les staffs aux profils affûtés — ta feuille de route devient un argument."
      >
        <div className={`grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center ${surfaceCard} p-6 sm:p-8`}>
          <div>
            <ul className="space-y-4">
              {[
                'Profils visibles avec stats homologuées et historique de compétition.',
                'Mercato, essais et statut « disponible » pour capter les opportunités.',
                'Messagerie compétition & notifications pour ne rien rater.',
                'Visibilité dans les classements et les temps forts OMJEP.',
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-omjep-text-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--omjep-gold)_70%,var(--omjep-mauve))]" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative rounded-2xl border border-omjep-border/60 bg-[color-mix(in_srgb,var(--omjep-bg-panel-soft)_90%,transparent)] p-6">
            <Radio className="absolute right-4 top-4 h-5 w-5 text-omjep-mauve/80" aria-hidden />
            <p className="font-heading text-sm font-bold uppercase tracking-wider text-omjep-text-muted">Live recrutement</p>
            <p className="mt-3 text-lg font-bold text-omjep-text-primary">« On cherche un MC box-to-box pour la League — profil OMJEP requis. »</p>
            <p className="mt-2 text-xs text-omjep-text-muted">Exemple de brief staff — démo narrative</p>
          </div>
        </div>
      </SectionShell>

      {/* Streamer / creator */}
      <SectionShell
        id="createurs"
        eyebrow="Visibilité"
        title="Créateurs & communauté"
        subtitle="OMJEP amplifie aussi les voix : contenus, clips et Discord rattachés à la compétition."
      >
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-omjep-border/70 bg-[color-mix(in_srgb,var(--omjep-bg-panel)_92%,var(--omjep-bg-elevated))] px-6 py-8 text-center sm:flex-row sm:text-left">
          <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
            {[
              { Icon: PlayCircle, label: 'YouTube' },
              { Icon: Tv, label: 'Kick' },
              { Icon: MessageCircle, label: 'Discord' },
              { Icon: Users, label: 'Communauté' },
            ].map(({ Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-xl border border-omjep-border/60 bg-omjep-bg-panel-soft/90 px-4 py-2.5 text-sm font-semibold text-omjep-text-primary"
              >
                <Icon className="h-4 w-4 text-omjep-mauve" aria-hidden />
                {label}
              </span>
            ))}
          </div>
          <Link
            to="/community"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-omjep-mauve transition hover:text-omjep-text-primary"
          >
            Voir l’actualité
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </SectionShell>

      {/* Final CTA */}
      <section className="join-omjep-cta mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--omjep-mauve)_35%,var(--omjep-border))] bg-[color-mix(in_srgb,var(--omjep-mauve)_14%,var(--omjep-bg-panel))] p-8 shadow-[var(--omjep-shadow-lg)] sm:p-10 lg:p-12"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
        >
          <div className="join-omjep-cta-shine pointer-events-none absolute inset-0 opacity-50 motion-reduce:opacity-25" aria-hidden />
          <div className="relative text-center">
            <h2 className="font-heading text-2xl font-black tracking-tight text-omjep-text-primary sm:text-3xl lg:text-4xl">
              Prêt à enfiler le maillot OMJEP ?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-omjep-text-secondary sm:text-base">
              Crée ton compte, complète ton profil joueur et intègre le calendrier des compétitions officielles Pro Clubs.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/register"
                className="inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-xl border border-white/20 bg-[color-mix(in_srgb,var(--omjep-mauve)_25%,#1a1030)] px-6 py-3.5 text-sm font-bold text-white shadow-[var(--omjep-glow-mauve-soft)] transition hover:brightness-110"
              >
                Je veux participer
              </Link>
              <Link
                to="/register"
                className="omjep-btn-primary inline-flex min-h-[48px] min-w-[200px] items-center justify-center px-6 py-3.5 text-sm font-semibold normal-case tracking-normal"
              >
                Créer mon compte joueur
              </Link>
              <Link
                to="/plateforme#live-matches"
                className="inline-flex min-h-[48px] items-center justify-center px-4 py-3 text-sm font-semibold text-omjep-text-primary underline-offset-4 transition hover:underline"
              >
                Découvrir les compétitions
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
