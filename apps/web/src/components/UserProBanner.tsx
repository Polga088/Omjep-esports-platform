import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Coins, Zap, Paintbrush } from 'lucide-react'
import type { UserRole } from '@omjep/shared'
import type { User } from '@/store/useAuthStore'
import { formatAmountDigits, formatCurrency } from '@/utils/formatCurrency'
import { TechnicalDataValue } from '@/components/kimi/TechnicalDataValue'
import { ProfileHeroMedia } from '@/components/ProfileHeroMedia'
import RankBadge from '@/components/RankBadge'
import PlayerIdentity from '@/components/PlayerIdentity'
/** Portrait Lamine Yamal — CC BY 4.0, Wikimedia Commons (fichier local). */
import yamalPhotoUrl from '@/assets/profile/yamal-photo.jpg?url'

export type UserProBannerProps = {
  user: User | null | undefined
  loading: boolean
}

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

const roleLine = (role: UserRole | undefined) => {
  if (role === 'ADMIN') return 'Administrateur — Accès complet'
  if (role === 'MODERATOR') return 'Commissaire de Ligue'
  if (role === 'MANAGER') return 'Manager de Club'
  return 'Joueur'
}

/**
 * Bannière identité dashboard (EA FC style) + avatar hex avec scan doré.
 */
export default function UserProBanner({ user, loading }: UserProBannerProps) {
  return (
    <div className="relative -mx-4 w-[calc(100%+2rem)] overflow-visible hub-athlete-bg lg:-mx-8 lg:w-[calc(100%+4rem)]">
      <section
        className="relative h-64 w-full overflow-hidden rounded-t-2xl border-b border-omjep-border shadow-[0_20px_80px_rgba(0,0,0,0.45)] outline-none"
        aria-label="Bannière du tableau de bord"
      >
        {loading ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#0f0f0f] via-[#0a0a0a] to-[#050505]" aria-busy />
        ) : (
          <ProfileHeroMedia savedBannerUrl={user?.activeBannerUrl?.trim() || null} />
        )}
        <div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background: 'radial-gradient(circle at 20% 50%, rgba(110,89,217,0.2), transparent)',
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#050505]/90 via-[#080808]/70 to-[#050505]/90" aria-hidden />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#050505]/95 via-transparent to-transparent" />

        <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2 sm:right-5 sm:top-4">
          {user?.omjepCoins !== undefined && (
            <div className="hud-surface flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5 sm:flex-row sm:items-baseline sm:gap-1.5">
              <div className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-omjep-gold" />
                <span className="kimi-kpi-label text-omjep-gold/75">OC</span>
              </div>
              <TechnicalDataValue
                accent="gold"
                symbolScale="sm"
                className="text-xs font-semibold sm:text-sm"
                aria-label={formatCurrency(user.omjepCoins, 'OC')}
              >
                {formatAmountDigits(user.omjepCoins)}
              </TechnicalDataValue>
            </div>
          )}
          {user?.jepyCoins !== undefined && user.jepyCoins > 0 && (
            <div className="hud-surface flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5 sm:flex-row sm:items-baseline sm:gap-1.5">
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-omjep-mauve" />
                <span className="kimi-kpi-label text-omjep-mauve/75">Jepy</span>
              </div>
              <TechnicalDataValue
                accent="cyan"
                symbolScale="sm"
                className="text-xs font-semibold sm:text-sm"
                aria-label={formatCurrency(user.jepyCoins, 'Jepy')}
              >
                {formatAmountDigits(user.jepyCoins)}
              </TechnicalDataValue>
            </div>
          )}
        </div>

        <Link
          to="/dashboard/store?tab=cosmetics"
          className="tactical-ghost-button tactical-os-label absolute bottom-4 right-4 z-30 px-3 py-2 text-[10px] font-extrabold tracking-[0.18em] sm:bottom-5 sm:right-5 sm:px-3.5"
        >
          <Paintbrush className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          Personnaliser mon profil
        </Link>
      </section>

      <motion.div
        className="relative z-[50] -mb-10 -mt-14 flex flex-col-reverse items-center gap-5 px-4 pb-1 sm:-mb-12 sm:-mt-20 sm:flex-row sm:items-center sm:justify-start sm:gap-6 sm:pl-8 md:gap-8 md:pl-12"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 0.85 }}
      >
        <div
          className="relative z-[51] h-[5.5rem] w-[5.5rem] shrink-0 p-[2px] [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] [background:linear-gradient(135deg,rgba(212,175,55,0.55),rgba(212,175,55,0.12))]"
          title="Avatar"
        >
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#020202] [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]">
            <div className="omjep-hologram-avatar-stack flex h-full w-full items-center justify-center">
              <div className="omjep-hologram-avatar-main flex h-full w-full items-center justify-center">
                <PlayerIdentity
                  initial={(user?.ea_persona_name ?? 'J').charAt(0).toUpperCase()}
                  avatarUrl={user?.avatarUrl?.trim() ? user.avatarUrl : yamalPhotoUrl}
                  rarity={user?.avatarRarity ?? 'legendary'}
                  activeFrameUrl={user?.activeFrameUrl}
                  royalEagleFrame={!user?.activeFrameUrl?.trim()}
                  activeJerseyId={undefined}
                  teamPrimaryColor={undefined}
                  teamSecondaryColor={undefined}
                  size="sm"
                  showcaseCutout
                  imgAlt={user?.ea_persona_name ?? 'Joueur'}
                  className="scale-110"
                />
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-0 z-[3] overflow-hidden [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]"
              aria-hidden
            >
              <div className="omjep-hex-scan-track">
                <div className="omjep-hex-scan-line" />
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-[52] flex flex-col items-center text-center sm:items-start sm:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-omjep-text-secondary">
            {greeting().toUpperCase()},
          </p>
          <div className="mt-1 flex min-w-0 items-center justify-center gap-2.5 sm:justify-start">
            <h1 className="font-heading min-w-0 truncate text-3xl font-extrabold italic tracking-wide text-omjep-text-primary sm:text-4xl">
              {user?.ea_persona_name ?? 'Joueur'}
            </h1>
            {user?.level !== undefined && <RankBadge level={user.level} size="sm" className="shrink-0" />}
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-omjep-gold">
            {roleLine(user?.role)}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
