import { ForbiddenException } from '@nestjs/common';
import { CardReflectionService } from './card-reflection.service';

describe('카드 반응', () => {
  const ownedCard = { id: 1, book: { id: 10, user: { id: 7 } } };
  const setup = () => {
    const cards = { findOne: jest.fn().mockResolvedValue(ownedCard) };
    const rows: any[] = [];
    const reflections = {
      createQueryBuilder: () => ({
        insert: () => ({
          values: (value: any) => ({
            orIgnore: () => ({
              execute: async () => {
                if (!rows.some((r) => r.requestId === value.requestId))
                  rows.push({ id: rows.length + 1, ...value });
              },
            }),
          }),
        }),
      }),
      findOneByOrFail: async (where: any) =>
        rows.find(
          (r) => r.cardId === where.cardId && r.requestId === where.requestId,
        ),
      delete: jest.fn(),
    };
    const source = { query: jest.fn().mockResolvedValue([]) };
    return {
      service: new CardReflectionService(
        cards as any,
        reflections as any,
        source as any,
      ),
      cards,
      reflections,
      rows,
      source,
    };
  };

  it('같은 저장 요청을 재시도해도 반응은 하나만 남는다', async () => {
    const { service, rows } = setup();
    const input = {
      reaction: 'agree' as const,
      note: '  여전히 동의  ',
      requestId: 'cfa58bbf-a807-43e1-aa08-073614dd2f23',
    };
    const first = await service.create(7, 1, input);
    expect(await service.create(7, 1, input)).toEqual(first);
    expect(rows).toHaveLength(1);
    expect(first.note).toBe('여전히 동의');
  });

  it('다른 사용자는 반응을 남기거나 삭제하거나 후보를 조회할 수 없다', async () => {
    const { service, rows, source } = setup();
    await expect(
      service.create(8, 1, {
        reaction: 'agree',
        requestId: 'cfa58bbf-a807-43e1-aa08-073614dd2f23',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(8, 1, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.related(8, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(rows).toHaveLength(0);
    expect(source.query).not.toHaveBeenCalled();
  });

  it('임베딩 후보가 없으면 빈 목록을 반환한다', async () => {
    const { service } = setup();
    expect(await service.related(7, 1)).toEqual({ items: [] });
  });

  it('반응 삭제는 해당 카드의 이력에만 적용한다', async () => {
    const { service, reflections } = setup();
    await service.remove(7, 1, 8);
    expect(reflections.delete).toHaveBeenCalledWith({ id: 8, cardId: 1 });
  });
});
