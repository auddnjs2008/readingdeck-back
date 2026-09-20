import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { REACTIONS, Reaction } from '../entity/card-reflection.entity';

export class CreateReflectionDto {
  @IsIn(REACTIONS) reaction: Reaction;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsUUID() requestId: string;
}

export class ReflectionQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cursor?: number;
}
