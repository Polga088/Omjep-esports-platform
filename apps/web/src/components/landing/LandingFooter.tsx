import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';

const social = [
  { label: 'Instagram', href: 'https://instagram.com', rel: 'noopener noreferrer' },
  { label: 'Discord', href: 'https://discord.com', rel: 'noopener noreferrer' },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-indigo-500/10 bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 ring-1 ring-indigo-400/20">
              <Crown className="h-5 w-5 text-indigo-300" fill="currentColor" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-tighter text-white">OMJEP</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                Org. Marocaine des Jeux Électroniques Pro
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel={s.rel}
                className="font-mono text-xs uppercase tracking-widest text-slate-500 transition hover:text-indigo-400"
              >
                {s.label}
              </a>
            ))}
            <Link
              to="/hall-of-fame"
              className="font-mono text-xs uppercase tracking-widest text-slate-500 transition hover:text-indigo-400"
            >
              Palmarès
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/[0.06] pt-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500">Proudly Moroccan</p>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} OMJEP — Fédération E-sport Maroc</p>
        </div>
      </div>
    </footer>
  );
}
