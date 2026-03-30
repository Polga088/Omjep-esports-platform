import { type HTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from './lib/cn';
import type { OmitMotionConflicts } from './lib/omit-motion-conflicts';
import { hoverLiftY, springSoft } from './lib/motion-presets';

export interface CardProps extends OmitMotionConflicts<HTMLAttributes<HTMLDivElement>> {
  children: ReactNode;
  /** Subtle gold rim + inner vignette */
  variant?: 'premium' | 'flat';
  /** Lift on hover (pointer devices) */
  interactive?: boolean;
}

export function Card({ className, children, variant = 'premium', interactive = false, ...props }: CardProps) {
  const reduceMotion = useReducedMotion();

  const surface = cn(
    'rounded-2xl p-5 md:p-6',
    variant === 'premium' && [
      'relative overflow-hidden',
      'bg-gradient-to-br from-[#141a28] via-[#0f131d] to-[#0a0d14]',
      'border border-[#D4AF37]/35 shadow-[0_0_0_1px_rgba(212,175,55,0.08),0_24px_48px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]',
      'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_80%_at_50%_-20%,rgba(212,175,55,0.12),transparent_55%)]',
    ],
    variant === 'flat' && 'border border-white/10 bg-[#111827]/90',
  );

  if (!interactive) {
    return (
      <div className={cn(surface, className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(surface, 'cursor-default will-change-transform', className)}
      whileHover={reduceMotion ? undefined : { y: hoverLiftY }}
      transition={springSoft}
      {...props}
    >
      {children}
    </motion.div>
  );
}
