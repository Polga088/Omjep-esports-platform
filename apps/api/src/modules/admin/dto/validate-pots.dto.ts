import { IsArray, ArrayNotEmpty } from 'class-validator';

export class ValidatePotsDto {
  /** Chaque entrée = un chapeau (liste d'IDs d'équipe). */
  @IsArray()
  @ArrayNotEmpty()
  pots!: string[][];

  // Validation des éléments imbriqués faite dans DrawService (IDs string).
}
