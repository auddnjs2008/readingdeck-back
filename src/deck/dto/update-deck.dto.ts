import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateDeckDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;
}
