import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum BookSortType {
  CREATED_AT = 'createdAt',
  RECENT_CARD = 'recentCard',
  MOST_CARDS = 'mostCards',
}

export class FilterBookQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 10;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(BookSortType)
  sort?: BookSortType;
}
