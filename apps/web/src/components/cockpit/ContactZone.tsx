import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type ContactZoneVariant = 'primary' | 'ghost' | 'danger'
type ContactZoneSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<ContactZoneSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-[11px] tracking-[0.18em]',
  md: 'min-h-[44px] px-4 py-2 text-xs tracking-[0.2em]',
  lg: 'min-h-[52px] px-5 py-2.5 text-sm tracking-[0.22em]',
}

const variantMap: Record<ContactZoneVariant, string> = {
  primary:
    'border-emerald-500/35 text-emerald-200 hover:border-emerald-400/85 hover:text-white hover:shadow-[0_0_28px_-2px_rgba(34,197,94,0.55),inset_0_0_28px_-12px_rgba(34,197,94,0.55)]',
  ghost:
    'border-white/10 text-slate-300 hover:border-emerald-400/65 hover:text-emerald-100 hover:shadow-[0_0_24px_-4px_rgba(34,197,94,0.45)]',
  danger:
    'border-rose-500/30 text-rose-300 hover:border-rose-400/85 hover:text-rose-100 hover:shadow-[0_0_24px_-4px_rgba(244,63,94,0.55)]',
}

const baseClasses =
  'contact-zone group relative inline-flex select-none items-center justify-center gap-2 rounded-md border bg-[#020202]/80 font-heading font-semibold uppercase backdrop-blur-md transition-[border-color,box-shadow,color,background-color] duration-200 ease-out cursor-pointer focus:outline-none focus-visible:border-emerald-300 focus-visible:shadow-[0_0_28px_-2px_rgba(34,197,94,0.65)]'

type CommonProps = {
  variant?: ContactZoneVariant
  size?: ContactZoneSize
  iconLeft?: ReactNode
  iconRight?: ReactNode
  className?: string
  children?: ReactNode
}

type AsButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | 'as'> & {
    as?: 'button'
  }

type AsLinkProps = CommonProps &
  Omit<LinkProps, keyof CommonProps | 'as'> & {
    as: 'link'
  }

export type ContactZoneProps = AsButtonProps | AsLinkProps

/**
 * Zone de Contact — remplace le bouton standard.
 * Bordure + halo qui s'allument au survol.
 */
export const ContactZone = forwardRef<HTMLButtonElement | HTMLAnchorElement, ContactZoneProps>(
  (props, ref) => {
    const { variant = 'primary', size = 'md', iconLeft, iconRight, className = '', children } = props
    const classes = `${baseClasses} ${sizeMap[size]} ${variantMap[variant]} ${className}`.trim()

    const inner = (
      <>
        <span
          className="pointer-events-none absolute inset-0 rounded-md border border-transparent transition-colors duration-200 group-hover:border-emerald-300/35"
          aria-hidden
        />
        {iconLeft ? <span className="relative z-10 inline-flex">{iconLeft}</span> : null}
        <span className="relative z-10">{children}</span>
        {iconRight ? <span className="relative z-10 inline-flex">{iconRight}</span> : null}
      </>
    )

    if (props.as === 'link') {
      const { as: _as, variant: _v, size: _s, iconLeft: _l, iconRight: _r, className: _c, ...linkRest } = props
      return (
        <Link {...linkRest} className={classes} ref={ref as React.Ref<HTMLAnchorElement>}>
          {inner}
        </Link>
      )
    }

    const { as: _as, variant: _v, size: _s, iconLeft: _l, iconRight: _r, className: _c, ...btnRest } =
      props
    return (
      <button {...btnRest} type={btnRest.type ?? 'button'} className={classes} ref={ref as React.Ref<HTMLButtonElement>}>
        {inner}
      </button>
    )
  }
)

ContactZone.displayName = 'ContactZone'

export default ContactZone
