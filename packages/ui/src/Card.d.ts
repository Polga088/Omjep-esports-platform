import { type HTMLAttributes, type ReactNode } from 'react';
import type { OmitMotionConflicts } from './lib/omit-motion-conflicts';
export interface CardProps extends OmitMotionConflicts<HTMLAttributes<HTMLDivElement>> {
    children: ReactNode;
    /** Subtle gold rim + inner vignette */
    variant?: 'premium' | 'flat';
    /** Lift on hover (pointer devices) */
    interactive?: boolean;
}
export declare function Card({ className, children, variant, interactive, ...props }: CardProps): import("react").JSX.Element;
//# sourceMappingURL=Card.d.ts.map