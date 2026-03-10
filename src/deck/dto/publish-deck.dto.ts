import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class PublishDeckDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
