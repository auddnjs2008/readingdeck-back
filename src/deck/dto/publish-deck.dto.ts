import {
  IsOptional,
  IsString,
  Length,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class PublishDeckDto {
  @IsInt()
  @Min(1)
  expectedVersion: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
