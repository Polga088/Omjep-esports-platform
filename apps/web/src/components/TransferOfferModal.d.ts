interface Props {
    open: boolean;
    onClose: () => void;
    player: {
        id: string;
        name: string;
        position: string | null;
        teamId: string;
        teamName: string;
        marketValue: number | null;
    };
    myTeam: {
        id: string;
        name: string;
        budget: number;
    };
    onSuccess?: () => void;
}
export default function TransferOfferModal({ open, onClose, player, myTeam, onSuccess }: Props): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=TransferOfferModal.d.ts.map