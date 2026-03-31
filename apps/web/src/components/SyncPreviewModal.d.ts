interface MatchTarget {
    id: string;
    homeTeam: {
        id: string;
        name: string;
        logo_url?: string | null;
    };
    awayTeam: {
        id: string;
        name: string;
        logo_url?: string | null;
    };
    competition?: {
        name: string;
    } | null;
    round?: string | null;
}
interface Props {
    match: MatchTarget;
    open: boolean;
    onClose: () => void;
    onSynced: () => void;
}
export default function SyncPreviewModal({ match, open, onClose, onSynced }: Props): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=SyncPreviewModal.d.ts.map