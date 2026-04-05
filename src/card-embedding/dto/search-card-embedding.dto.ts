import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SearchCardEmbeddingDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
