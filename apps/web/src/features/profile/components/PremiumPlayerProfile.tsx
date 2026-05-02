import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2,
  Sparkles,
  Shield,
  Footprints,
  Crosshair,
  WandSparkles,
  Download,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import type { UserPremiumProfile } from '../mocks/premiumProfile.mock'

const statList = [
  { key: 'pace', label: 'Vitesse' },
  { key: 'dribbling', label: 'Dribbles' },
  { key: 'shooting', label: 'Tir' },
  { key: 'passing', label: 'Passes' },
  { key: 'defense', label: 'Défense' },
  { key: 'physical', label: 'Physique' },
] as const

const playStyleIcon = {
  speed: Footprints,
  dribble: Sparkles,
  finishing: Crosshair,
  creation: WandSparkles,
} as const

const formatMarketValue = (value: number) => `${(value / 1_000_000).toFixed(1)}M`

interface PremiumPlayerProfileProps {
  profile: UserPremiumProfile | null
  isLoading?: boolean
}

const PremiumPlayerProfile = ({ profile, isLoading = false }: PremiumPlayerProfileProps) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const cardCaptureRef = useRef<HTMLDivElement | null>(null)


  const equippedStyle = useMemo(
    () =>
      profile?.cardStylesInventory.find((cardStyle) => cardStyle.isEquipped) ??
      profile?.cardStylesInventory[0],
    [profile],
  )

  const hasPremiumEffect =
    equippedStyle?.rarity === 'LEGENDARY' ||
    equippedStyle?.rarity === 'EPIC' ||
    equippedStyle?.rarity === 'ELITE'

  const playerPhotoUrl = useMemo(() => {
    if (!profile) return ''
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=0f172a&color=ffffff&size=512&bold=true`
  }, [profile])

  const handleDownloadCard = async () => {
    if (!profile || !cardCaptureRef.current || isDownloading) return

    setIsDownloading(true)
    try {
      const dataUrl = await toPng(cardCaptureRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#06080f',
      })

      const sanitizedUsername = profile.username.replace(/[^a-z0-9_-]/gi, '_')
      const link = document.createElement('a')
      link.download = `OMJEP_Card_${sanitizedUsername}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading || !profile || !equippedStyle) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-omjep-border bg-omjep-bg-panel/95">
        <Loader2 className="h-9 w-9 animate-spin text-omjep-gold" />
      </div>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-omjep-border bg-omjep-bg-panel/95 p-5 shadow-[var(--omjep-shadow-lg)] ring-1 ring-omjep-border/70 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--omjep-cobalt)_20%,transparent),transparent_45%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--omjep-gold)_18%,transparent),transparent_38%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <article className="relative">
          <button
            type="button"
            onClick={() => void handleDownloadCard()}
            disabled={isDownloading}
            className="absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-lg border border-omjep-border bg-omjep-bg-elevated/95 px-3 py-2 text-xs font-semibold text-omjep-text-primary backdrop-blur-sm transition hover:border-omjep-mauve/45 hover:text-omjep-mauve disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Télécharger la carte premium"
            title="Télécharger la carte premium"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PNG HD
          </button>
          {hasPremiumEffect && (
            <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-r from-omjep-gold/18 via-omjep-cobalt/14 to-omjep-mauve/16 blur-2xl animate-pulse" />
          )}
          <div
            ref={cardCaptureRef}
            className="relative rounded-3xl border border-omjep-border-gold/35 bg-gradient-to-b from-omjep-bg-elevated to-omjep-bg-panel p-4"
          >
            <img
              src={equippedStyle.imageUrl}
              alt={equippedStyle.name}
              className={`w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)] ${
                hasPremiumEffect
                  ? 'brightness-110 drop-shadow-[0_0_28px_color-mix(in_srgb,var(--omjep-gold)_25%,transparent)]'
                  : ''
              }`}
            />

            <img
              src={playerPhotoUrl}
              alt={profile.displayName}
              className="pointer-events-none absolute left-1/2 top-[28%] h-[52%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-omjep-border object-cover shadow-[var(--omjep-shadow-lg)]"
            />

            <div className="absolute left-6 top-6 text-omjep-gold">
              <p className="text-5xl font-black leading-none">87</p>
              <p className="mt-1 text-3xl font-black text-omjep-text-primary">{profile.mainPosition}</p>
            </div>

            <div className="absolute bottom-8 left-6 right-6">
              <h2 className="text-center text-3xl font-black uppercase tracking-wide text-omjep-text-primary drop-shadow-sm">
                {profile.displayName}
              </h2>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm font-bold text-omjep-text-secondary">
                <span>{profile.nationality}</span>
                <span className="text-omjep-text-muted">•</span>
                <span>{profile.mainPosition}</span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2 border-t border-omjep-border/80 pt-3">
                {statList.map(({ key, label }) => (
                  <div key={key} className="text-center">
                    <p className="text-[11px] uppercase tracking-wide text-omjep-gold/90">
                      {label.slice(0, 3)}
                    </p>
                    <p className="text-xl font-black text-omjep-text-primary">
                      {profile.attributes[key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="space-y-5 rounded-2xl border border-omjep-border bg-omjep-bg-panel/95 p-5">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-omjep-border pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-omjep-cobalt">
                {profile.username}
              </p>
              <h3 className="text-3xl font-black uppercase leading-tight text-omjep-text-primary">
                {profile.displayName}
              </h3>
              <p className="mt-2 text-sm text-omjep-text-secondary">
                {profile.age} ans • {profile.heightCm / 100} m • Pied{' '}
                {profile.preferredFoot === 'LEFT' ? 'gauche' : 'droit'}
              </p>
            </div>
            <div className="rounded-xl border border-omjep-border bg-omjep-bg-elevated/90 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-omjep-text-muted">Poste principal</p>
              <p className="text-3xl font-black text-omjep-cobalt">{profile.mainPosition}</p>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/80 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-omjep-text-muted">Équipe actuelle</p>
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={profile.currentClub.logoUrl}
                  alt={profile.currentClub.name}
                  className="h-10 w-10 rounded-md border border-omjep-border bg-omjep-bg-elevated object-contain p-1"
                />
                <div>
                  <p className="text-base font-bold text-omjep-text-primary">{profile.currentClub.name}</p>
                  <p className="text-xs text-omjep-cobalt">{profile.currentClub.league}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/80 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-omjep-text-muted">Valeur marchande (OC)</p>
              <p className="mt-2 text-4xl font-black text-omjep-gold">
                {formatMarketValue(profile.performance.marketValue)}
              </p>
              <p className="text-xs text-omjep-text-muted">Économie club — pas JPY cosmétique</p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-cobalt">
              Attributs clés
            </p>
            {statList.map(({ key, label }) => {
              const value = profile.attributes[key]
              return (
                <div key={key} className="grid grid-cols-[90px_1fr_42px] items-center gap-3">
                  <p className="text-sm font-semibold text-omjep-text-primary">{label}</p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-omjep-bg-elevated">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-omjep-mauve via-omjep-cobalt to-omjep-gold/90 shadow-[0_0_12px_color-mix(in_srgb,var(--omjep-mauve)_35%,transparent)]"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <p className="text-right text-xl font-black text-omjep-text-primary">{value}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-omjep-border bg-omjep-bg-panel-soft/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-cobalt">
              Styles de jeu
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {profile.playStyles.map((style) => {
                const Icon = playStyleIcon[style.icon] ?? Shield
                return (
                  <div
                    key={style.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-omjep-mauve/35 bg-omjep-mauve/10 px-3 py-2"
                  >
                    <Icon className="h-4 w-4 text-omjep-mauve" />
                    <span className="text-sm font-semibold text-omjep-text-primary">{style.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              to="/dashboard/store?tab=card-styles"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-omjep-mauve/50 bg-omjep-mauve px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-white shadow-[var(--omjep-glow-mauve-soft)] transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              Personnaliser ma carte
            </Link>
            <Link
              to="/dashboard/store?tab=cosmetics"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-omjep-border bg-omjep-bg-elevated px-4 py-3 text-xs font-bold uppercase tracking-wide text-omjep-text-primary transition hover:border-omjep-mauve/40"
            >
              Boutique cosmétiques
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}

export default PremiumPlayerProfile
