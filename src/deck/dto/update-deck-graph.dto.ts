import { Type } from 'class-transformer';
import { ValidateNested, IsInt, Min } from 'class-validator';
import { DeckGraphConnectionDto } from './deck-graph-connection.dto';
import { DeckGraphNodeDto } from './deck-graph-node.dto';

export class UpdateDeckGraphDto {
  @IsInt()
  @Min(1)
  expectedVersion: number;

  @ValidateNested({ each: true })
  @Type(() => DeckGraphNodeDto)
  nodes: DeckGraphNodeDto[];

  @ValidateNested({ each: true })
  @Type(() => DeckGraphConnectionDto)
  connections: DeckGraphConnectionDto[];
}
