import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class AdminStoreItemPatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceJepy?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
