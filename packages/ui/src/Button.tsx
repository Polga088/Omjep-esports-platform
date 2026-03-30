import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from './lib/cn';
import type { OmitMotionConflicts } from './lib/omit-motion-conflicts';
import { hoverLiftY, springSnappy, tapScale } from './lib/motion-presets';

export type ButtonVariant = 'gold' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends OmitMotionConflicts<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  gold:
    'bg-gradient-to-b from-[#E8C547] via-[#D4AF37] to-[#9A7B1A] text-[#0A0E1A] font-semibold shadow-[0_0_24px_-4px_rgba(212,175,55,0.55)] border border-[#F5E6A3]/40 hover:shadow-[0_0_32px_-2px_rgba(212,175,55,0.65)]',
  outline:
    'bg-transparent text-[#F5E6A3] border-2 border-[#D4AF37]/90 hover:bg-[#D4AF37]/10 hover:border-[#E8C547]',
  ghost: 'bg-transparent text-slate-200 border border-transparent hover:bg-white/5 hover:text-[#F5E6A3]',
  danger:
    'bg-red-950/80 text-red-100 border border-red-500/40 hover:bg-red-900/70 hover:border-red-400/60',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-7 text-base gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'gold',
    size = 'md',
    leftIcon,
    rightIcon,
    loading,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileTap={reduceMotion || isDisabled ? undefined : { scale: tapScale }}
      whileHover={reduceMotion || isDisabled ? undefined : { y: hoverLiftY }}
      transition={springSnappy}
      className={cn(
        'relative inline-flex items-center justify-center font-display tracking-wide',
        'outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0E1A]',
        'disabled:pointer-events-none disabled:opacity-45',
        'select-none will-change-transform',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-90"
          aria-hidden
        />
      ) : (
        leftIcon
      )}
      <span className={cn('inline-flex items-center gap-2', loading && 'sr-only')}>{children}</span>
      {!loading && rightIcon}
    </motion.button>
  );
});
