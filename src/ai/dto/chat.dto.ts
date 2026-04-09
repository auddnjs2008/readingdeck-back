import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  threadId?: string;
}
