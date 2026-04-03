import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';

export interface MaintenancePrestigeProps {
  title?: string;
  message?: string;
  /** CTA (lien, bouton) */
  children?: ReactNode;
  className?: string;
  /** Anneaux pulsants (défaut) ou cadenas néon cyan */
  icon?: 'rings' | 'lock';
  /**
   * Calque semi-transparent sur la zone (le parent doit rester visible derrière en faible contraste).
   * Utiliser dans un conteneur `relative` avec `min-height` si besoin.
   */
  overlay?: boolean;
}

function PrestigeIcon({ variant }: { variant: 'rings' | 'lock' }) {
  if (variant === 'lock') {
    return (
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
        <span className="maintenance-prestige-ring maintenance-prestige-ring--outer absolute inset-0 rounded-full border-2 border-cyan-400/20 opacity-50" />
        <span className="maintenance-prestige-ring maintenance-prestige-ring--mid absolute inset-[10px] rounded-full border border-cyan-400/25 opacity-45" />
        <Lock
          className="maintenance-prestige-lock relative z-[2] h-14 w-14 text-cyan-300"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
      <span className="maintenance-prestige-ring maintenance-prestige-ring--outer absolute inset-0 rounded-full border-2 border-cyan-400/35" />
      <span className="maintenance-prestige-ring maintenance-prestige-ring--mid absolute inset-[10px] rounded-full border border-amber-400/40" />
      <span className="maintenance-prestige-ring maintenance-prestige-ring--inner absolute inset-[22px] rounded-full border border-cyan-300/50 shadow-[0_0_24px_rgba(34,211,238,0.35)]" />
      <span className="relative z-[1] h-3 w-3 rounded-full bg-gradient-to-br from-cyan-300 to-amber-400 shadow-[0_0_16px_rgba(34,211,238,0.9),0_0_28px_rgba(234,179,8,0.45)]" />
    </div>
  );
}

function PrestigeCard({
  title,
  message,
  children,
  className,
  icon,
}: Omit<MaintenancePrestigeProps, 'overlay'>) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#06080d]/95 px-8 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="maintenance-prestige-aura pointer-events-none absolute -left-1/4 top-1/2 h-[140%] w-[150%] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500/25 via-transparent to-amber-500/20 blur-3xl" />
      <div className="maintenance-prestige-grid pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />

      <div className="relative z-[1] mx-auto flex max-w-md flex-col items-center">
        <PrestigeIcon variant={icon ?? 'rings'} />

        <h2 className="font-display text-lg font-black uppercase tracking-[0.2em] text-white [text-shadow:0_0_24px_rgba(34,211,238,0.35),0_0_8px_rgba(234,179,8,0.2)]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{message}</p>
        {children ? <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </div>
  );
}

const PRESTIGE_MSG = 'Initialisation du système en cours…';

/**
 * État « indisponible » — pulsation néon cyan/or (ou cadenas) à la place d’un message d’erreur brut.
 */
export default function MaintenancePrestige({
  title = 'Indisponible',
  message = PRESTIGE_MSG,
  children,
  className = '',
  icon = 'rings',
  overlay = false,
}: MaintenancePrestigeProps) {
  const card = (
    <PrestigeCard title={title} message={message} icon={icon} className={overlay ? '' : className}>
      {children}
    </PrestigeCard>
  );

  if (overlay) {
    return (
      <div
        className={`relative min-h-[min(50vh,400px)] w-full overflow-hidden rounded-2xl border border-cyan-500/15 bg-[#0a0e1a]/35 ${className}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.04)_0%,transparent_50%,rgba(234,179,8,0.03)_100%)]" />
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b12]/88 backdrop-blur-md p-4 sm:p-8">
          <div className="w-full max-w-lg">{card}</div>
        </div>
      </div>
    );
  }

  return card;
}

export { PRESTIGE_MSG };
