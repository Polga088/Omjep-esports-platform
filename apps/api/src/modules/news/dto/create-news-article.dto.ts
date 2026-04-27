import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { NewsCategory } from '../news.service';

export class CreateNewsArticleDto {
  @IsIn(['MERCATO', 'TOURNAMENT', 'UPDATE'])
  category!: NewsCategory;

  @IsString()
  @MinLength(6)
  @MaxLength(140)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(280)
  excerpt!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  readTime!: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  quote?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  body?: string[];
}
