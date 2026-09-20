import { IsIn, IsInt, Min } from 'class-validator';

export const RELATIONS = {
  similar: '비슷해요',
  opposite: '반대돼요',
  extends: '이어져요',
  question: '질문이 생겨요',
} as const;
export class AddCardConnectionDto {
  @IsInt() @Min(1) fromCardId: number;
  @IsInt() @Min(1) toCardId: number;
  @IsIn(Object.keys(RELATIONS)) relation: keyof typeof RELATIONS;
}
