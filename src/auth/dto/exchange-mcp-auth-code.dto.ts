import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExchangeMcpAuthCodeDto {
  @IsString()
  @MinLength(16)
  @MaxLength(255)
  code: string;
}
