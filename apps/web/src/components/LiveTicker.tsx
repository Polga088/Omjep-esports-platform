import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

interface NewsEvent {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

const FALLBACK_TICKER: string[] = [
  'Mercato Live — Suivez les offres et signatures en temps réel',
  'OMJEP — Négociations, contre-propositions et transferts officialisés',
  'Cliquez pour ouvrir le hub Mercato →',
];

export default function LiveTicker() {
  const [lines, setLines] = useState<string[]>(FALLBACK_TICKER);
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripW, setStripW] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<NewsEvent[]>('/news/transfers?limit=14')
      .then(({ data }) => {
        if (cancelled || !data?.length) return;
        const next = data.map((n) => `${n.title} · ${n.description}`.replace(/\s+/g, ' ').trim());
        setLines(next.length ? next : FALLBACK_TICKER);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStripW(el.offsetWidth));
    ro.observe(el);
    setStripW(el.offsetWidth);
    return () => ro.disconnect();
  }, [lines]);

  const duration = stripW > 0 ? Math.max(28, stripW / 45) : 32;

  return (
    <div className="flex h-9 w-full min-w-0 items-center gap-3 border-b border-cyan-500/10 bg-[#050910]/90 px-3 backdrop-blur-md sm:px-5">
      <Link
        to="/dashboard/transfers"
        className="flex shrink-0 items-center gap-2 rounded-md border border-red-500/35 bg-red-950/50 px-2 py-0.5 transition hover:border-red-400/50 hover:bg-red-950/70"
        title="Ouvrir Mercato Live"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="mercato-live-badge-ea-pulse text-[10px] font-black uppercase tracking-widest text-white">
          LIVE
        </span>
      </Link>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-[#050910] to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-[#050910] to-transparent"
          aria-hidden
        />
        <motion.div
          className="flex w-max flex-row gap-0"
          style={{ willChange: 'transform' }}
          animate={stripW > 0 ? { x: [0, -stripW] } : { x: 0 }}
          transition={
            stripW > 0
              ? { duration, repeat: Infinity, ease: 'linear', repeatType: 'loop' }
              : { duration: 0 }
          }
        >
          <div ref={stripRef} className="flex shrink-0 gap-12 pr-12">
            {lines.map((text, i) => (
              <span
                key={`a-${i}`}
                className="whitespace-nowrap font-scifi text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400"
              >
                <span className="text-cyan-400/90">◆</span> {text}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 gap-12 pr-12" aria-hidden>
            {lines.map((text, i) => (
              <span
                key={`b-${i}`}
                className="whitespace-nowrap font-scifi text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400"
              >
                <span className="text-cyan-400/90">◆</span> {text}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
