import { ProClubsService } from '../sync/proclubs.service';
export declare class AdminSyncController {
    private readonly proClubsService;
    constructor(proClubsService: ProClubsService);
    syncMatch(matchId: string): Promise<{
        message: string;
        synced: boolean;
        match?: undefined;
        matchedPlayers?: undefined;
        eventsCreated?: undefined;
    } | {
        message: string;
        synced: boolean;
        match: Record<string, unknown> | undefined;
        matchedPlayers: import("../sync/proclubs.service").PersonaMatch[] | undefined;
        eventsCreated: number | undefined;
    }>;
    syncFromUrl(url: string): Promise<{
        message: string;
        synced: boolean;
        scraped: import("../sync/proclubs.service").ScrapedMatchResult | undefined;
        matchedPlayers?: undefined;
    } | {
        message: string;
        synced: boolean;
        scraped: import("../sync/proclubs.service").ScrapedMatchResult | undefined;
        matchedPlayers: import("../sync/proclubs.service").PersonaMatch[] | undefined;
    }>;
}
//# sourceMappingURL=admin-sync.controller.d.ts.map