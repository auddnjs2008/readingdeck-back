import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class DeckGraphConnectionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromNodeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toNodeId?: number;

  @IsOptional()
  @IsString()
  fromNodeClientKey?: string;

  @IsOptional()
  @IsString()
  toNodeClientKey?: string;

  @IsOptional()
  @IsString()
  type?: string | null;

  @IsOptional()
  @IsObject()
  style?: { stroke?: string; strokeWidth?: number } | null;

  @IsOptional()
  @IsBoolean()
  animated?: boolean;

  @IsOptional()
  @IsObject()
  markerEnd?: { type?: string } | null;

  @IsOptional()
  @IsString()
  sourceHandle?: string | null;

  @IsOptional()
  @IsString()
  targetHandle?: string | null;

  @IsOptional()
  @IsString()
  label?: string | null;
}
