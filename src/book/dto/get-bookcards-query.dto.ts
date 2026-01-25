import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CardType } from 'src/card/entity/card.entity';

export enum CardSortType {
  LATEST = 'latest',
  OLDEST = 'oldest',
}

export class GetBookCardsQueryDto {
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
  @IsEnum(CardType, { each: true })
  types?: CardType[];

  @IsOptional()
  @Type(() => Boolean)
  hasQuote?: boolean;

  @IsOptional()
  @IsEnum(CardSortType)
  sort?: CardSortType;
}
