import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export type RankTier = 'bronze' | 'silver' | 'gold' | 'elite';

export function rankTierFromLevel(level: number): RankTier {
  const lv = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
  if (lv >= 61) return 'elite';
  if (lv >= 31) return 'gold';
  if (lv >= 11) return 'silver';
  return 'bronze';
}

const TIER_META: Record<
  RankTier,
  { label: string; sub: string; ring: string; glow: string; icon: string }
> = {
  bronze: {
    label: 'Bronze',
    sub: '1–10',
    ring: 'from-amber-900/90 via-amber-700/80 to-amber-950/90',
    glow: 'shadow-[0_0_20px_rgba(180,83,9,0.35)]',
    icon: 'text-amber-600',
  },
  silver: {
    label: 'Argent',
    sub: '11–30',
    ring: 'from-slate-300/95 via-slate-400/90 to-slate-600/95',
    glow: 'shadow-[0_0_22px_rgba(148,163,184,0.45)]',
    icon: 'text-slate-300',
  },
  gold: {
    label: 'Or',
    sub: '31–60',
    ring: 'from-amber-300/95 via-yellow-400/90 to-amber-600/95',
    glow: 'shadow-[0_0_26px_rgba(251,191,36,0.5)]',
    icon: 'text-amber-300',
  },
  elite: {
    label: 'Élite',
    sub: '61+',
    ring: 'from-amber-200/95 via-yellow-300/90 to-amber-500/95',
    glow: 'shadow-[0_0_32px_rgba(253,224,71,0.55),0_0_48px_rgba(234,179,8,0.25)]',
    icon: 'text-amber-200',
  },
};

const PARTICLE_COUNT = 10;

function EliteParticles({ className = '' }: { className?: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: 20 + ((i * 37) % 60),
        y: 15 + ((i * 23) % 70),
        delay: (i * 0.18) % 2.4,
        duration: 2.2 + (i % 5) * 0.35,
        size: 2 + (i % 3),
      })),
    [],
  );

  return (
    <span className={`pointer-events-none absolute inset-0 overflow-visible ${className}`} aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-gradient-to-br from-amber-200 to-yellow-500"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            boxShadow: '0 0 6px rgba(253,224,71,0.9), 0 0 12px rgba(234,179,8,0.5)',
          }}
          initial={{ opacity: 0, scale: 0.4, y: 0 }}
          animate={{
            opacity: [0, 1, 0.85, 0],
            scale: [0.4, 1.15, 0.9, 0.5],
            y: [-4, -14, -6, 2],
            x: [0, (p.id % 2 === 0 ? 1 : -1) * 6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}

export interface RankBadgeProps {
  level: number;
  size?: 'sm' | 'md';
  className?: string;
  showLabel?: boolean;
}

export default function RankBadge({ level, size = 'md', className = '', showLabel = true }: RankBadgeProps) {
  const tier = rankTierFromLevel(level);
  const meta = TIER_META[tier];
  const isElite = tier === 'elite';

  const box =
    size === 'sm'
      ? 'h-8 min-w-[2rem] gap-0.5 px-1.5 py-0.5'
      : 'h-9 min-w-[2.5rem] gap-1 px-2 py-1';
  const iconSz = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const textMain = size === 'sm' ? 'text-[8px]' : 'text-[9px]';
  const textSub = size === 'sm' ? 'text-[6px]' : 'text-[7px]';

  return (
    <div
      className={`relative inline-flex overflow-visible ${className}`}
      title={`Rang ${meta.label} · Niveau ${level}`}
    >
      <div
        className={`relative inline-flex items-center justify-center overflow-visible rounded-lg border border-white/10 bg-black/50 ${box} ${meta.glow} backdrop-blur-sm`}
      >
        {isElite ? <EliteParticles className="z-0 rounded-lg" /> : null}
        <div
          className={`relative z-[1] flex items-center gap-1 rounded-md bg-gradient-to-br p-0.5 ${meta.ring}`}
        >
          <div className="flex items-center gap-1 rounded-[5px] bg-[#0a0e14]/95 px-1 py-0.5">
            <Shield className={`${iconSz} shrink-0 ${meta.icon}`} strokeWidth={2} aria-hidden />
            {showLabel ? (
              <div className="flex min-w-0 flex-col leading-none">
                <span className={`font-display font-black uppercase tracking-wider text-white ${textMain}`}>
                  {meta.label}
                </span>
                <span className={`font-mono tabular-nums text-white/50 ${textSub}`}>Lv.{level}</span>
              </div>
            ) : (
              <span className={`font-mono font-bold tabular-nums text-white/90 ${textMain}`}>{level}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
