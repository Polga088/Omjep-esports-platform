import { IsEnum, IsOptional, IsArray, IsUUID } from 'class-validator';

export class DrawDto {
  /** 'auto' = backend fait le tirage aléatoire ; 'manual' = seeds/pots fournis par le frontend */
  @IsEnum(['auto', 'manual'])
  mode!: 'auto' | 'manual';

  /**
   * CUP manuel : IDs des équipes dans l'ordre des têtes de série
   * (position 0 = tête de série 1, meilleure équipe).
   * Le backend applique le pairing : seed[0] vs seed[N-1], seed[1] vs seed[N-2], …
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  seeds?: string[];

  /**
   * CHAMPIONS manuel : pots[0..3], chaque sous-tableau = équipes de ce chapeau.
   * pots[0] = têtes de série (chefs de groupe), pots[1..3] = chapeaux 2-4.
   * Contrainte : une équipe par chapeau par groupe (garantie par le backend).
   */
  @IsOptional()
  @IsArray()
  pots?: string[][];
}
