import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

/**
 * Booléen JSON strict : seuls `true` et `false` sont acceptés (pas de chaîne ni de 0/1).
 */
export class UpdateCompetitionTransferMarketDto {
  @Transform(({ value }) => (value === true || value === false ? value : undefined))
  @IsBoolean({ message: 'isTransferMarketOpen doit être un booléen JSON strict (true ou false).' })
  isTransferMarketOpen!: boolean;
}
