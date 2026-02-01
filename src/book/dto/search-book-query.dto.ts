import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum KakaoBookSort {
  ACCURACY = 'accuracy',
  LATEST = 'latest',
}

export enum KakaoBookTarget {
  TITLE = 'title',
  ISBN = 'isbn',
  PUBLISHER = 'publisher',
  PERSON = 'person',
}

export class SearchBookQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number = 10;

  @IsOptional()
  @IsEnum(KakaoBookSort)
  sort?: KakaoBookSort;

  @IsOptional()
  @IsEnum(KakaoBookTarget)
  target?: KakaoBookTarget;
}
