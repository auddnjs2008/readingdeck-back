import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { BookStatus } from '../entity/book.entity';

export class CreateBookDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  isbn?: string;

  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsString()
  publisher: string;

  @IsString()
  @IsOptional()
  contents: string;

  @IsOptional()
  @IsString()
  imageUrl: string;

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
