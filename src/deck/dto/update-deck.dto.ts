import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { DeckMode } from '../entity/deck.entity';

export class UpdateDeckDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(DeckMode)
  mode?: DeckMode;
}
