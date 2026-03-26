import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CardType } from 'src/card/entity/card.entity';
import { DeckMode } from 'src/deck/entity/deck.entity';

enum SortType {
  LATEST = 'latest',
  OLDEST = 'oldest',
}

export class GetCommunityPostsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 12;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor?: number = 0;

  @IsOptional()
  @IsEnum(DeckMode)
  mode?: DeckMode;

  @IsOptional()
  @IsEnum(CardType)
  type?: CardType;

  @IsOptional()
  @IsEnum(SortType)
  sort?: SortType = SortType.LATEST;
}
