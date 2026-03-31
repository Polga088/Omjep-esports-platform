import { type HTMLAttributes, type ReactNode } from 'react';
import type { OmitMotionConflicts } from './lib/omit-motion-conflicts';
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
export declare function PlayerCard({ className, name, rating, position, imageUrl, imageAlt, clubSlot, nationSlot, footer, ...props }: PlayerCardProps): import("react").JSX.Element;
//# sourceMappingURL=PlayerCard.d.ts.map