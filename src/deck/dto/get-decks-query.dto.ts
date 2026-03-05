import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DeckMode, DeckStatus } from '../entity/deck.entity';

enum SortType {
  LATEST = 'latest',
  OLDEST = 'oldest',
}

export class GetDecksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursor?: number;

  @IsOptional()
  @IsEnum(DeckMode)
  mode?: DeckMode;

  @IsOptional()
  @IsEnum(DeckStatus)
  status?: DeckStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(SortType)
  sort?: SortType;
}
