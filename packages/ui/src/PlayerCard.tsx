import { type HTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from './lib/cn';
import type { OmitMotionConflicts } from './lib/omit-motion-conflicts';
import { springSoft, tapScale } from './lib/motion-presets';

export interface PlayerCardProps extends Omit<OmitMotionConflicts<HTMLAttributes<HTMLDivElement>>, 'children'> {
  name: string;
  /** Overall-style rating (e.g. 87) */
  rating: number | string;
  /** Short position label: ST, CAM, GK… */
  position?: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Optional crest / club logo */
  clubSlot?: ReactNode;
  /** Optional nation flag or icon */
  nationSlot?: ReactNode;
  footer?: ReactNode;
}

/**
 * FUT-inspired player tile: dark slab, gold frame, chem-style gloss sweep.
 */
export function PlayerCard({
  className,
  name,
  rating,
  position,
  imageUrl,
  imageAlt,
  clubSlot,
  nationSlot,
  footer,
  ...props
}: PlayerCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        'group relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl',
        'border-2 border-[#D4AF37]/80 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(212,175,55,0.15)]',
        'bg-gradient-to-b from-[#1a2235] via-[#121826] to-[#0a0e16]',
        'will-change-transform',
        className,
      )}
      whileHover={reduceMotion ? undefined : { scale: 1.02, y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: tapScale }}
      transition={springSoft}
      {...props}
    >
      {/* Gloss sweep — transform-only for smooth scrolling/hover */}
      {!reduceMotion ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
          <div className="absolute inset-y-0 left-0 w-[55%] -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/14 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[260%]" />
        </div>
      ) : null}

      <div className="absolute left-2 top-2 z-10 flex flex-col leading-none">
        <span className="font-display text-3xl font-bold tabular-nums text-[#F5E6A3] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          {rating}
        </span>
        {position ? (
          <span className="mt-0.5 text-center font-display text-xs font-semibold tracking-widest text-[#D4AF37]/95">
            {position}
          </span>
        ) : null}
      </div>

      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
        {nationSlot ? <div className="flex size-7 items-center justify-center rounded bg-black/35 ring-1 ring-[#D4AF37]/30">{nationSlot}</div> : null}
        {clubSlot ? <div className="flex size-8 items-center justify-center rounded bg-black/35 ring-1 ring-[#D4AF37]/30">{clubSlot}</div> : null}
      </div>

      <div className="relative flex h-[58%] items-end justify-center px-3 pt-10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt ?? name}
            className="max-h-full w-auto object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.65)]"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-full w-24 items-center justify-center rounded-lg bg-black/25 font-display text-4xl font-bold text-[#D4AF37]/25"
            aria-hidden
          >
            ?
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/88 to-transparent px-2 pb-3 pt-10">
        <div className="border-t border-[#D4AF37]/35 bg-gradient-to-r from-[#D4AF37]/15 via-transparent to-[#D4AF37]/15 px-2 py-2 text-center">
          <p className="truncate font-display text-sm font-bold uppercase tracking-wide text-[#F8EEC8]">{name}</p>
        </div>
        {footer ? <div className="mt-2 px-1">{footer}</div> : null}
      </div>
    </motion.div>
  );
}
