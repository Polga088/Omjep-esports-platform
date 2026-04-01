import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Swords, Trophy, Shield } from 'lucide-react';
import { MatchCard, type MatchBrief } from './TournamentBrackets';

interface BracketRound {
  name: string;
  matches: MatchBrief[];
}

interface Props {
  rounds: BracketRound[];
  myTeamId?: string | null;
}

function relRect(el: HTMLElement, container: HTMLElement) {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return {
    left: er.left - cr.left,
    top: er.top - cr.top,
    right: er.right - cr.left,
    bottom: er.bottom - cr.top,
    cx: (er.left + er.right) / 2 - cr.left,
    cy: (er.top + er.bottom) / 2 - cr.top,
  };
}

export default function CupView({ rounds, myTeamId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const [svgPaths, setSvgPaths] = useState<{ d: string; key: string }[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  for (let i = 0; i < rounds.length; i++) {
    const n = rounds[i].matches.length;
    if (!cardRefs.current[i]) cardRefs.current[i] = [];
    while (cardRefs.current[i].length < n) cardRefs.current[i].push(null);
    cardRefs.current[i].length = n;
  }
  cardRefs.current.length = rounds.length;

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container || rounds.length < 2) {
      setSvgPaths([]);
      return;
    }

    const cr = container.getBoundingClientRect();
    setSvgSize({ w: cr.width, h: cr.height });

    const paths: { d: string; key: string }[] = [];

    for (let col = 0; col < rounds.length - 1; col++) {
      const right = rounds[col + 1].matches;

      for (let j = 0; j < right.length; j++) {
        const i0 = j * 2;
        const i1 = j * 2 + 1;
        const leftEl0 = cardRefs.current[col]?.[i0];
        const leftEl1 = cardRefs.current[col]?.[i1];
        const rightEl = cardRefs.current[col + 1]?.[j];
        if (!rightEl) continue;

        const next = relRect(rightEl, container);

        if (leftEl0 && leftEl1) {
          const a = relRect(leftEl0, container);
          const b = relRect(leftEl1, container);
          const span = next.left - Math.max(a.right, b.right);
          const xMid = Math.max(a.right, b.right) + Math.max(18, span * 0.35);
          const yCenter = (a.cy + b.cy) / 2;

          const d = [
            `M ${a.right} ${a.cy}`,
            `H ${xMid}`,
            `M ${b.right} ${b.cy}`,
            `H ${xMid}`,
            `M ${xMid} ${a.cy}`,
            `V ${b.cy}`,
            `M ${xMid} ${yCenter}`,
            `H ${next.left}`,
          ].join(' ');
          paths.push({ d, key: `c${col}-j${j}` });
        } else if (leftEl0) {
          const a = relRect(leftEl0, container);
          const span = next.left - a.right;
          const xMid = a.right + Math.max(18, span * 0.4);
          const d = [`M ${a.right} ${a.cy}`, `H ${xMid}`, `V ${next.cy}`, `H ${next.left}`].join(' ');
          paths.push({ d, key: `c${col}-j${j}-bye` });
        }
      }
    }

    setSvgPaths(paths);
  }, [rounds]);

  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [recompute]);

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <Swords className="w-8 h-8 text-slate-700 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Aucun match généré pour cette coupe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/40" />
          Vainqueur
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500/30 border border-indigo-500/40" />
          Mon club
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
          À jouer
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-x-auto pb-6">
        {svgSize.w > 0 && svgSize.h > 0 && (
          <svg
            className="absolute left-0 top-0 pointer-events-none z-0 text-amber-500/40"
            width={svgSize.w}
            height={svgSize.h}
            aria-hidden
          >
            {svgPaths.map(({ d, key }) => (
              <path
                key={key}
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        )}

        <div className="relative z-10 flex flex-row gap-6 min-w-max items-stretch">
          {rounds.map((round, colIdx) => (
            <div key={round.name} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {round.name === 'Finale' ? (
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    round.name === 'Finale' ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {round.name}
                </span>
                <span className="ml-1 text-[10px] text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                  {round.matches.length} match{round.matches.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex flex-col gap-3 justify-center flex-1">
                {round.matches.length === 0 ? (
                  <div className="min-w-[190px] h-16 rounded-xl border border-dashed border-white/[0.06] flex items-center justify-center">
                    <span className="text-[10px] text-slate-700">En attente</span>
                  </div>
                ) : (
                  round.matches.map((match, mi) => (
                    <div
                      key={match.id}
                      ref={(el) => {
                        if (!cardRefs.current[colIdx]) cardRefs.current[colIdx] = [];
                        cardRefs.current[colIdx][mi] = el;
                      }}
                    >
                      <MatchCard match={match} myTeamId={myTeamId} />
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
