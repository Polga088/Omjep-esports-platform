interface PlayerCardProps {
    rating: number;
    position: string;
    name: string;
    goals: number;
    assists: number;
    appearances: number;
    nationality?: string;
    clubName?: string;
    clubLogoUrl?: string | null;
    marketValue?: number | null;
    level?: number;
    xp?: number;
}
export default function PlayerCard({ rating, position, name, goals, assists, appearances, nationality, clubName, clubLogoUrl, marketValue, level, xp, }: PlayerCardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=PlayerCard.d.ts.map