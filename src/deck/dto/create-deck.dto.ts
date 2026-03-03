import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { DeckMode, DeckStatus } from 'src/deck/entity/deck.entity';
import { DeckGraphConnectionDto } from './deck-graph-connection.dto';
import { DeckGraphNodeDto } from './deck-graph-node.dto';

export class CreateDeckDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsEnum(DeckStatus)
  status?: DeckStatus;

  @IsOptional()
  @IsEnum(DeckMode)
  mode?: DeckMode;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckGraphNodeDto)
  nodes?: DeckGraphNodeDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckGraphConnectionDto)
  connections?: DeckGraphConnectionDto[];
}
