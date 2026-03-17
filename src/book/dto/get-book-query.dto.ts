import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BookStatus } from '../entity/book.entity';

export enum BookSortType {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  RECENT_CARD = 'recentCard',
  MOST_CARDS = 'mostCards',
}

export class GetBookQueryDto {
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

  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;
}
