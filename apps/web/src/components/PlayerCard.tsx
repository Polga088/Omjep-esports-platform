import { xpProgress } from '@/lib/leveling';

interface PlayerCardProps {
  rating: number;
  position: string;
  name: string;
  goals: number;
  assists: number;
  appearances: number;
  nationality?: string;
  clubName?: string;
  clubLogoUrl?: string | null;
  marketValue?: number | null;
  level?: number;
  xp?: number;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

function HexBadge({ level }: { level: number }) {
  return (
    <div className="absolute -top-2 -left-2 z-20 w-[46px] h-[52px] flex items-center justify-center drop-shadow-lg">
      <svg
        viewBox="0 0 46 52"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hexGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFA500" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <filter id="hexGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points="23,1 44,14 44,38 23,51 2,38 2,14"
          fill="url(#hexGold)"
          stroke="#FFD700"
          strokeWidth="1.5"
          filter="url(#hexGlow)"
          opacity="0.95"
        />
        <polygon
          points="23,5 40,16 40,36 23,47 6,36 6,16"
          fill="rgba(0,0,0,0.5)"
          stroke="rgba(255,215,0,0.3)"
          strokeWidth="0.5"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center leading-none">
        <span className="text-[7px] font-bold uppercase tracking-wider text-amber-300/80">
          Lvl
        </span>
        <span className="text-sm font-black text-white tabular-nums" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          {level}
        </span>
      </div>
    </div>
  );
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const progress = xpProgress(xp, level);

  return (
    <div className="w-full mt-1.5 px-2">
      <div className="relative h-[5px] rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${progress.percentage}%`,
            background: 'linear-gradient(90deg, #B8860B 0%, #FFD700 50%, #FFF8DC 100%)',
            boxShadow: '0 0 8px rgba(255, 215, 0, 0.6), 0 0 2px rgba(255, 215, 0, 0.8)',
          }}
        />
      </div>
      <p className="text-[8px] text-amber-500/50 text-center mt-0.5 tabular-nums font-semibold tracking-wide">
        {progress.current} / {progress.needed} XP
      </p>
    </div>
  );
}

export default function PlayerCard({
  rating,
  position,
  name,
  goals,
  assists,
  appearances,
  nationality,
  clubName,
  clubLogoUrl,
  marketValue,
  level,
  xp,
}: PlayerCardProps) {
  const ratingColor =
    rating >= 85
      ? 'text-amber-300'
      : rating >= 75
        ? 'text-emerald-400'
        : rating >= 65
          ? 'text-blue-400'
          : 'text-slate-300';

  const showLevel = level != null && level > 0;
  const showXp = xp != null && level != null;

  return (
    <div className="relative w-[260px] h-[380px] select-none">
      {/* Outer glow */}
      <div className="absolute -inset-3 rounded-[28px] bg-amber-500/20 blur-2xl pointer-events-none" />

      {/* Card body */}
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl shadow-black/60"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, #fbbf24 0%, #b45309 30%, #1c1917 60%, #020617 100%)',
        }}
      >
        {/* Laser grid pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="laser" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
              <line x1="0" y1="0" x2="0" y2="20" stroke="#fbbf24" strokeWidth="0.5" />
              <line x1="0" y1="0" x2="20" y2="0" stroke="#fbbf24" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#laser)" />
        </svg>

        {/* Diagonal shine sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, transparent 30%, rgba(251,191,36,0.08) 45%, transparent 55%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-5 py-5">
          {/* ── Top section: Rating + Position + Badges ── */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col items-center">
              <span
                className={`font-display font-black text-[44px] leading-none tracking-tight ${ratingColor} drop-shadow-lg`}
              >
                {rating}
              </span>
              <span className="text-amber-400/90 text-[11px] font-extrabold uppercase tracking-[0.25em] mt-0.5">
                {position}
              </span>

              {/* Badges */}
              <div className="flex flex-col items-center gap-1.5 mt-3">
                {nationality && (
                  <span className="text-lg leading-none" title={nationality}>
                    🇲🇦
                  </span>
                )}
                {clubLogoUrl ? (
                  <img
                    src={clubLogoUrl}
                    alt={clubName ?? ''}
                    className="w-6 h-6 rounded object-cover border border-amber-500/20"
                  />
                ) : clubName ? (
                  <div className="w-6 h-6 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[9px] font-black text-amber-400">
                    {clubName.charAt(0)}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Card type badge */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-amber-500/50">
                Ultimate
              </span>
              <div className="w-6 h-[1px] bg-gradient-to-l from-amber-500/40 to-transparent" />
            </div>
          </div>

          {/* ── Center: Player Avatar placeholder + Name ── */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-2">
            {/* Hexagonal avatar frame with Level badge */}
            <div className="relative w-[90px] h-[90px] mb-4">
              {showLevel && <HexBadge level={level} />}
              <div
                className="absolute inset-0 rounded-full border-2 border-amber-500/30"
                style={{
                  background:
                    'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display font-black text-3xl text-amber-400/80 uppercase">
                  {name.charAt(0)}
                </span>
              </div>
            </div>

            {/* Player name */}
            <h2
              className="font-display font-black text-xl text-white uppercase tracking-wider text-center leading-tight drop-shadow-lg"
              style={{ textShadow: '0 2px 12px rgba(251,191,36,0.3)' }}
            >
              {name}
            </h2>

            {/* XP progress bar */}
            {showXp && <XpBar xp={xp} level={level} />}
          </div>

          {/* ── Bottom: Stat block ── */}
          <div className="mt-auto">
            {/* Market value badge */}
            {marketValue != null && marketValue > 0 && (
              <div className="flex justify-center mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">Val.</span>
                  <span className="text-xs font-black text-emerald-400 tabular-nums">{formatValue(marketValue)} €</span>
                </div>
              </div>
            )}

            {/* Separator */}
            <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mb-3" />

            <div className="grid grid-cols-3 gap-1">
              {[
                { label: 'GOA', value: goals },
                { label: 'AST', value: assists },
                { label: 'APP', value: appearances },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center py-1.5">
                  <span className="font-display font-black text-lg text-white tabular-nums leading-none">
                    {value}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-500/60 mt-1">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom edge accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>
    </div>
  );
}
