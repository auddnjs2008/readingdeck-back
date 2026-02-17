import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { DeckNodeType } from 'src/deck-node/entity/deck-node.entity';

export class DeckGraphNodeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @IsOptional()
  @IsString()
  clientKey?: string;

  @IsEnum(DeckNodeType)
  type: DeckNodeType;

  @ValidateIf((o) => o.type === DeckNodeType.BOOK)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId?: number;

  @ValidateIf((o) => o.type === DeckNodeType.CARD)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cardId?: number;

  @Type(() => Number)
  @IsNumber()
  positionX: number;

  @Type(() => Number)
  @IsNumber()
  positionY: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
