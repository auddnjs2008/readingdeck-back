import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 20)
  name?: string;
}
