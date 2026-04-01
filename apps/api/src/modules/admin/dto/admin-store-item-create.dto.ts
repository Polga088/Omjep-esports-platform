import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { StoreItemCategory } from '@omjep/shared';

export class AdminStoreItemCreateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsInt()
  @Min(0)
  priceJepy!: number;

  @IsEnum(StoreItemCategory)
  category!: StoreItemCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  imageUrl!: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
