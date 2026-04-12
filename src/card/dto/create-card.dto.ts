import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { CardType } from '../entity/card.entity';

export class CreateCardDto {
  @IsEnum(CardType)
  type: CardType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsOptional()
  quote?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  thought: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageStart: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageEnd: number;
}
