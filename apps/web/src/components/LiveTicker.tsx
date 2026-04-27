import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    <div className="flex h-9 w-full min-w-0 items-center px-3 sm:px-5">
      <div className="relative min-w-0 flex-1 overflow-hidden">
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
                className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.18em] ${isDark ? 'text-white/70' : 'text-black/70'}`}
              >
                {text}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 gap-12 pr-12" aria-hidden>
            {lines.map((text, i) => (
              <span
                key={`b-${i}`}
                className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.18em] ${isDark ? 'text-white/70' : 'text-black/70'}`}
              >
                {text}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
