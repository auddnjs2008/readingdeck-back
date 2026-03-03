import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DeckMode } from '../entity/deck.entity';

export class UpdateDeckDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsEnum(DeckMode)
  mode?: DeckMode;
}
