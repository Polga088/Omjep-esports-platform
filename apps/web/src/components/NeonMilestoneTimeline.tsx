import { useMemo, useId } from 'react';
import { motion } from 'framer-motion';

export interface NeonMilestone {
  label: string;
  xpRequired: number;
  reached: boolean;
  level: number;
}

type StepNodeProps = {
  milestone: NeonMilestone;
  x: number;
  y: number;
  flowActive: boolean;
  strokeGradientId: string;
};

/** Nœud jalons — or / cyan si atteint, contour bleu tamisé sinon */
export function StepNode({ milestone, x, y, flowActive, strokeGradientId }: StepNodeProps) {
  const { reached, level, label } = milestone;
  const r = 15;
  return (
    <g transform={`translate(${x},${y})`}>
      {reached && flowActive && (
        <circle r={r + 6} fill="rgba(34, 211, 238, 0.12)" className="animate-pulse" />
      )}
      <circle
        r={r}
        fill={reached ? 'rgba(15, 23, 42, 0.92)' : 'rgba(10, 16, 31, 0.95)'}
        stroke={reached ? `url(#${strokeGradientId})` : 'rgba(6, 182, 212, 0.28)'}
        strokeWidth={reached ? 2.2 : 1.5}
        style={{
          filter: reached
            ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.45)) drop-shadow(0 0 14px rgba(34, 211, 238, 0.25))'
            : undefined,
        }}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill={reached ? '#fef3c7' : '#64748b'}
        style={{ fontFamily: 'Rajdhani, system-ui, sans-serif', fontSize: 12, fontWeight: 800 }}
      >
        {level}
      </text>
      <text
        y={r + 14}
        textAnchor="middle"
        fill={reached ? 'rgba(103, 232, 249, 0.8)' : '#64748b'}
        style={{ fontFamily: 'Rajdhani, system-ui, sans-serif', fontSize: 7.5, fontWeight: 700 }}
        className="uppercase tracking-wide"
      >
        {label.length > 14 ? `${label.slice(0, 12)}…` : label}
      </text>
    </g>
  );
}

function buildSinuPath(
  n: number,
  w: number,
  h: number,
): { d: string; points: { x: number; y: number }[] } {
  const pad = 36;
  const usable = w - 2 * pad;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0.5 : i / (n - 1);
    const x = pad + t * usable;
    const y = h * 0.5 + Math.sin(t * Math.PI * 2.35) * (h * 0.22);
    pts.push({ x, y });
  }
  if (pts.length === 0) return { d: '', points: [] };
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const c1x = p0.x + (p1.x - p0.x) * 0.35;
    const c1y = p0.y + (i % 2 === 0 ? 16 : -16);
    const c2x = p0.x + (p1.x - p0.x) * 0.65;
    const c2y = p1.y + (i % 2 === 0 ? -12 : 12);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }
  return { d, points: pts };
}

export function NeonMilestoneTimeline({
  milestones,
  currentXp,
  flowActive,
}: {
  milestones: NeonMilestone[];
  currentXp: number;
  flowActive: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const gradId = `${uid}-grad`;
  const glowId = `${uid}-glow`;
  const flowGradId = `${uid}-flow-grad`;
  const nodeStrokeId = `${uid}-node-stroke`;

  const maxXp = milestones[milestones.length - 1]?.xpRequired ?? 1;
  const progress = Math.min((currentXp / maxXp) * 100, 100);

  const vbW = 640;
  const vbH = 118;
  const { d, points } = useMemo(
    () => buildSinuPath(milestones.length, vbW, vbH - 28),
    [milestones.length],
  );

  return (
    <div className="relative pt-1">
      <div className="relative mx-auto w-full max-w-xl">
        <svg
          className="h-auto w-full overflow-visible"
          viewBox={`0 0 ${vbW} ${vbH}`}
          role="img"
          aria-label="Jalons de progression"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 0.45)" />
              <stop offset="50%" stopColor="rgba(251, 191, 36, 0.65)" />
              <stop offset="100%" stopColor="rgba(34, 211, 238, 0.5)" />
            </linearGradient>
            <linearGradient id={flowGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
              <stop offset="45%" stopColor="rgba(103, 232, 249, 0.9)" />
              <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
            </linearGradient>
            <linearGradient id={nodeStrokeId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {d ? (
            <>
              <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={3.5}
                strokeLinecap="round"
              />
              <path
                d={d}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={2.5}
                strokeLinecap="round"
                filter={`url(#${glowId})`}
              />
              <motion.path
                d={d}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: progress / 100 }}
                transition={{ duration: flowActive ? 0.55 : 1.05, ease: 'easeOut' }}
              />
              {flowActive ? (
                <path
                  d={d}
                  fill="none"
                  stroke={`url(#${flowGradId})`}
                  strokeWidth={4}
                  strokeLinecap="round"
                  className="neon-milestone-path-flow"
                />
              ) : null}
            </>
          ) : null}

          {milestones.map((m, i) => {
            const pt = points[i];
            if (!pt) return null;
            return (
              <StepNode
                key={m.level}
                milestone={m}
                x={pt.x}
                y={pt.y}
                flowActive={flowActive}
                strokeGradientId={nodeStrokeId}
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="relative h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: flowActive ? 0.55 : 1.15, ease: 'easeOut' }}
          style={{
            background: 'linear-gradient(90deg, #0891b2 0%, #22d3ee 38%, #fbbf24 72%, #fde68a 100%)',
            boxShadow: flowActive
              ? '0 0 18px rgba(34, 211, 238, 0.5), 0 0 26px rgba(251, 191, 36, 0.2)'
              : '0 0 10px rgba(251, 191, 36, 0.22)',
          }}
        />
      </div>
    </div>
  );
}
