import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { BookStatus } from '../entity/book.entity';

export class UpdateBookDto {
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalPages?: number;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  finishedAt?: string;
}
