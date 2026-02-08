import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CardType } from '../entity/card.entity';

export class CreateCardDto {
  @IsEnum(CardType)
  type: CardType;

  @IsString()
  @IsOptional()
  quote?: string;

  @IsString()
  thought: string;

  @IsNumber()
  @IsOptional()
  pageStart: number;

  @IsNumber()
  @IsOptional()
  pageEnd: number;
}
