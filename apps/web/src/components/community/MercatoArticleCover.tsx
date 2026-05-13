type MercatoArticleCoverProps = {
  playerName: string
  departureClubName: string
  arrivalClubName: string
  departureClubLogoUrl?: string | null
  arrivalClubLogoUrl?: string | null
  amountOc?: number | string
  status?: string
  compact?: boolean
}

const DEFAULT_STATUS = 'OFFICIEL'

function getClubInitials(clubName: string): string {
  const words = clubName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return '--'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
}

function formatOcAmount(amountOc?: number | string): string {
  if (typeof amountOc === 'number' && Number.isFinite(amountOc)) {
    return `${Math.max(0, Math.trunc(amountOc)).toLocaleString('fr-FR')} OC`
  }
  if (typeof amountOc === 'string' && amountOc.trim().length > 0) {
    return `${amountOc.trim()} OC`
  }
  return 'Montant NC'
}

function LogoSlot({
  clubName,
  logoUrl,
  className,
}: {
  clubName: string
  logoUrl?: string | null
  className: string
}) {
  const initials = getClubInitials(clubName)

  return (
    <div
      className={`absolute ${className} overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--omjep-gold)_35%,var(--omjep-mauve))] bg-[color-mix(in_srgb,var(--omjep-bg)_65%,transparent)] p-[6%] shadow-[0_14px_28px_-20px_color-mix(in_srgb,var(--omjep-gold)_60%,transparent)] backdrop-blur-sm`}
      aria-label={clubName}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={clubName}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/15 bg-[color-mix(in_srgb,var(--omjep-mauve)_28%,transparent)] font-heading text-xl font-black tracking-[0.08em] text-[color-mix(in_srgb,var(--omjep-gold)_92%,#fff)]">
          {initials}
        </div>
      )}
    </div>
  )
}

export default function MercatoArticleCover({
  playerName,
  departureClubName,
  arrivalClubName,
  departureClubLogoUrl,
  arrivalClubLogoUrl,
  amountOc,
  status,
  compact = false,
}: MercatoArticleCoverProps) {
  const normalizedStatus = status?.trim() || DEFAULT_STATUS
  const amountLabel = formatOcAmount(amountOc)
  const baseHeight = compact
    ? 'aspect-[16/9] min-h-[140px] sm:min-h-[150px]'
    : 'aspect-[16/9] min-h-[220px] sm:min-h-[280px]'
  const textScale = compact ? 'text-sm sm:text-base' : 'text-lg sm:text-2xl'
  const amountScale = compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'

  return (
    <div
      className={`relative ${baseHeight} w-full overflow-hidden rounded-2xl border border-omjep-border/70 bg-[#060913]`}
    >
      <img
        src="/images/community/mercato-template.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--omjep-bg)_8%,transparent)_0%,color-mix(in_srgb,var(--omjep-bg)_25%,transparent)_45%,color-mix(in_srgb,var(--omjep-bg)_78%,#000)_100%)]" />

      <LogoSlot
        clubName={departureClubName}
        logoUrl={departureClubLogoUrl}
        className="left-[12%] top-[28%] w-[18%] aspect-square"
      />
      <LogoSlot
        clubName={arrivalClubName}
        logoUrl={arrivalClubLogoUrl}
        className="right-[12%] top-[28%] w-[18%] aspect-square"
      />

      <div className="absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border border-[color-mix(in_srgb,var(--omjep-gold)_45%,var(--omjep-mauve))] bg-[color-mix(in_srgb,var(--omjep-bg)_72%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--omjep-gold)_90%,#fff)] backdrop-blur-sm sm:text-[11px]">
        {normalizedStatus}
      </div>

      <div className="absolute bottom-[8%] left-1/2 z-[2] flex w-[86%] -translate-x-1/2 flex-col items-center rounded-2xl border border-white/12 bg-[color-mix(in_srgb,var(--omjep-bg)_60%,transparent)] px-4 py-3 text-center backdrop-blur-md">
        <p className={`font-heading font-black uppercase tracking-[0.06em] text-omjep-text-primary ${textScale}`}>
          {playerName}
        </p>
        <p className={`mt-1 font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--omjep-gold)_88%,#fff)] ${amountScale}`}>
          {amountLabel}
        </p>
      </div>
    </div>
  )
}

export type { MercatoArticleCoverProps }
