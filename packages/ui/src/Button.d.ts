import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { OmitMotionConflicts } from './lib/omit-motion-conflicts';
export type ButtonVariant = 'gold' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps extends OmitMotionConflicts<ButtonHTMLAttributes<HTMLButtonElement>> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    loading?: boolean;
}
export declare const Button: import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=Button.d.ts.map