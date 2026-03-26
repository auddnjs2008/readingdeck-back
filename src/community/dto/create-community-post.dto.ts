import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCommunityPostDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  deckId: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  caption?: string;
}
