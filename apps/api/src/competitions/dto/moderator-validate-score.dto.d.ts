import { EventType } from '@omjep/database';
export declare class ModeratorScoreEventDto {
    player_id: string;
    team_id?: string;
    type: EventType;
    minute?: number;
}
export declare class ModeratorValidateScoreDto {
    events?: ModeratorScoreEventDto[];
}
//# sourceMappingURL=moderator-validate-score.dto.d.ts.map