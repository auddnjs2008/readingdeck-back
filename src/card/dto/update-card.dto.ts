import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CardType } from '../entity/card.entity';

export class UpdateCardDto {
  @IsOptional()
  @IsEnum(CardType)
  type?: CardType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  quote?: string;

  @IsOptional()
  @IsString()
  thought?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageStart?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageEnd?: number;
}
