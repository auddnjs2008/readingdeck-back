import { IsOptional, IsString } from 'class-validator';

export class CreateBookDto {
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
}
