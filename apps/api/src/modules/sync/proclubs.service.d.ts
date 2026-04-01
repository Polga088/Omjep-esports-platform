import { PrismaService } from '@api/prisma/prisma.service';
import { LevelingService } from '../leveling/leveling.service';
export interface ScrapedPlayerEvent {
    playerName: string;
    goals: number;
    assists: number;
}
export interface ScrapedMatchResult {
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    players: ScrapedPlayerEvent[];
}
export interface PersonaMatch {
    scraped: string;
    goals: number;
    assists: number;
    matched: {
        userId: string;
        teamId: string;
        eaPersonaName: string;
    } | null;
}
export interface SyncFromUrlResult {
    synced: boolean;
    reason?: string;
    scraped?: ScrapedMatchResult;
    matchedPlayers?: PersonaMatch[];
    createdEventsCount?: number;
    updatedMatch?: Record<string, unknown>;
}
export declare class ProClubsService {
    private readonly prisma;
    private readonly leveling;
    private readonly logger;
    private static readonly XP_GOAL;
    private static readonly XP_ASSIST;
    private static readonly XP_MATCH_PARTICIPATION;
    constructor(prisma: PrismaService, leveling: LevelingService);
    /**
     * Main entry point: scrapes a ProClubs.io URL, extracts the latest match
     * result + scorers/assisters, and matches them to OMJEP users via ea_persona_name.
     */
    syncFromProClubsUrl(url: string): Promise<SyncFromUrlResult>;
    /**
     * Full sync: scrape the page, find/create the Match in DB, insert MatchEvents.
     * Requires a matchId to target a specific OMJEP match.
     */
    syncMatchFromUrl(matchId: string): Promise<SyncFromUrlResult>;
    /**
     * Awards XP to every matched player based on the barème:
     *   Goal = 25 XP, Assist = 15 XP, Match participation = 50 XP.
     * Also grants cumulative XP to each player's team.
     */
    private awardXpForMatch;
    /**
     * Fetches the HTML from a ProClubs.io URL and extracts match data.
     *
     * ProClubs.io page structure (expected selectors — adjust if the site changes):
     * - Match score: `.match-score`, `.result-score`, or similar
     * - Team names: `.team-name`, `.club-name`, or header elements
     * - Player stats table: rows with player name, goals, assists columns
     *
     * Falls back to mock data in development if the URL is unreachable.
     */
    scrapeProClubsPage(url: string): Promise<ScrapedMatchResult | null>;
    /**
     * Parses the HTML of a ProClubs.io page.
     *
     * Common patterns on proclubs.io:
     *   - `.match-result` or `.match-header` for the score block
     *   - `.team-home .team-name` / `.team-away .team-name` for team names
     *   - Score digits in `.score`, `.match-score`, or similar
     *   - Player stats in a table or list with columns: name, goals, assists, rating
     *
     * This parser tries multiple selector strategies to be resilient.
     */
    private parseProClubsHtml;
    private textFrom;
    /**
     * Builds a lowercase name → { userId, teamId, eaPersonaName } map from a team.
     */
    private buildPersonaMapFromTeam;
    /**
     * Builds a combined persona map from both home and away teams (for match sync).
     */
    private buildPersonaMapFromMatch;
    /**
     * Matches scraped player names to OMJEP users using fuzzy-tolerant logic:
     *   1. Exact match (case-insensitive)
     *   2. Substring match (scraped name contained in ea_persona_name or vice versa)
     *   3. Normalized match (strip spaces, dashes, underscores)
     */
    matchScrapedPlayers(scrapedPlayers: ScrapedPlayerEvent[], personaMap: Map<string, {
        userId: string;
        teamId: string;
        eaPersonaName: string;
    }>): PersonaMatch[];
    private normalize;
    private buildEventsFromMatched;
    /**
     * Alias kept for backward compatibility with AdminSyncController.
     */
    syncMatch(matchId: string): Promise<SyncFromUrlResult>;
    private getMockScrapedResult;
}
//# sourceMappingURL=proclubs.service.d.ts.map