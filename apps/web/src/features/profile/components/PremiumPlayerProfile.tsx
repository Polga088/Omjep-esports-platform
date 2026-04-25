import { useMemo, useRef, useState } from 'react'
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
    equippedStyle?.rarity === 'GOLD' || equippedStyle?.rarity === 'SILVER'

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
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-[#080a11]">
        <Loader2 className="h-9 w-9 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-[#06080f] p-5 shadow-[0_25px_70px_rgba(0,0,0,0.65)] lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.2),transparent_38%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <article className="relative">
          <button
            type="button"
            onClick={() => void handleDownloadCard()}
            disabled={isDownloading}
            className="absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs font-semibold text-slate-100 backdrop-blur-sm transition hover:border-cyan-300/45 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-r from-amber-400/20 via-cyan-400/15 to-blue-500/20 blur-2xl animate-pulse" />
          )}
          <div
            ref={cardCaptureRef}
            className="relative rounded-3xl border border-amber-400/35 bg-gradient-to-b from-[#121520] to-[#090c14] p-4"
          >
            <img
              src={equippedStyle.imageUrl}
              alt={equippedStyle.name}
              className={`w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] ${
                hasPremiumEffect
                  ? 'brightness-110 drop-shadow-[0_0_30px_rgba(250,204,21,0.2)]'
                  : ''
              }`}
            />

            <img
              src={playerPhotoUrl}
              alt={profile.displayName}
              className="pointer-events-none absolute left-1/2 top-[28%] h-[52%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/10 object-cover shadow-[0_20px_45px_rgba(0,0,0,0.65)]"
            />

            <div className="absolute left-6 top-6 text-amber-200">
              <p className="text-5xl font-black leading-none">87</p>
              <p className="mt-1 text-3xl font-black">{profile.mainPosition}</p>
            </div>

            <div className="absolute bottom-8 left-6 right-6">
              <h2 className="text-center text-3xl font-black uppercase tracking-wide text-white drop-shadow-md">
                {profile.displayName}
              </h2>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm font-bold text-slate-200">
                <span>{profile.nationality}</span>
                <span className="text-slate-500">•</span>
                <span>{profile.mainPosition}</span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2 border-t border-white/15 pt-3">
                {statList.map(({ key, label }) => (
                  <div key={key} className="text-center">
                    <p className="text-[11px] uppercase tracking-wide text-amber-300/85">
                      {label.slice(0, 3)}
                    </p>
                    <p className="text-xl font-black text-white">
                      {profile.attributes[key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="space-y-5 rounded-2xl border border-white/10 bg-[#090c15]/90 p-5">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/90">
                {profile.username}
              </p>
              <h3 className="text-3xl font-black uppercase leading-tight text-white">
                {profile.displayName}
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                {profile.age} ans • {profile.heightCm / 100} m • Pied{' '}
                {profile.preferredFoot === 'LEFT' ? 'gauche' : 'droit'}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Poste principal</p>
              <p className="text-3xl font-black text-cyan-200">{profile.mainPosition}</p>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Équipe actuelle</p>
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={profile.currentClub.logoUrl}
                  alt={profile.currentClub.name}
                  className="h-10 w-10 rounded-md bg-white object-contain p-1"
                />
                <div>
                  <p className="text-base font-bold text-white">{profile.currentClub.name}</p>
                  <p className="text-xs text-cyan-200">{profile.currentClub.league}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Valeur marchande</p>
              <p className="mt-2 text-4xl font-black text-amber-300">
                {formatMarketValue(profile.performance.marketValue)}
              </p>
              <p className="text-xs text-slate-400">OMJEP Coins</p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-[#05070c]/75 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
              Attributs clés
            </p>
            {statList.map(({ key, label }) => {
              const value = profile.attributes[key]
              return (
                <div key={key} className="grid grid-cols-[90px_1fr_42px] items-center gap-3">
                  <p className="text-sm font-semibold text-slate-200">{label}</p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-cyan-300 shadow-[0_0_14px_rgba(251,191,36,0.45)]"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <p className="text-right text-xl font-black text-white">{value}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#05070c]/75 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
              Styles de jeu
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {profile.playStyles.map((style) => {
                const Icon = playStyleIcon[style.icon] ?? Shield
                return (
                  <div
                    key={style.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2"
                  >
                    <Icon className="h-4 w-4 text-amber-200" />
                    <span className="text-sm font-semibold text-slate-100">{style.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

export default PremiumPlayerProfile
