import { PrismaService } from '@api/prisma/prisma.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
export declare class AdminCompetitionsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        _count: {
            matches: number;
        };
        teams: ({
            team: {
                xp: number;
                id: string;
                created_at: Date;
                name: string;
                proclubs_url: string | null;
                ea_club_id: string | null;
                logo_url: string | null;
                platform: import("@omjep/database").$Enums.Platform;
                budget: number;
                prestige_level: number;
                validation_status: import("@omjep/database").$Enums.ValidationStatus;
                manager_id: string | null;
            };
        } & {
            joined_at: Date;
            team_id: string;
            competition_id: string;
        })[];
    } & {
        id: string;
        created_at: Date;
        name: string;
        status: import("@omjep/database").$Enums.CompetitionStatus;
        type: import("@omjep/database").$Enums.CompetitionType;
        start_date: Date | null;
        end_date: Date | null;
    })[]>;
    remove(id: string): Promise<{
        message: string;
    }>;
    createCompetition(dto: CreateCompetitionDto): Promise<{
        message: string;
        competition: {
            teams: ({
                team: {
                    xp: number;
                    id: string;
                    created_at: Date;
                    name: string;
                    proclubs_url: string | null;
                    ea_club_id: string | null;
                    logo_url: string | null;
                    platform: import("@omjep/database").$Enums.Platform;
                    budget: number;
                    prestige_level: number;
                    validation_status: import("@omjep/database").$Enums.ValidationStatus;
                    manager_id: string | null;
                };
            } & {
                joined_at: Date;
                team_id: string;
                competition_id: string;
            })[];
        } & {
            id: string;
            created_at: Date;
            name: string;
            status: import("@omjep/database").$Enums.CompetitionStatus;
            type: import("@omjep/database").$Enums.CompetitionType;
            start_date: Date | null;
            end_date: Date | null;
        };
    }>;
    generateCalendar(id: string): Promise<{
        message: string;
        matchCount: number;
    }>;
    private generateRoundRobin;
}
//# sourceMappingURL=admin-competitions.controller.d.ts.map