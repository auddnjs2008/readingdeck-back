jest.mock('../common/service/s3.service', () => ({ S3Service: class {} }));
jest.mock('../card-embedding/card-embedding.service', () => ({
  CardEmbeddingService: class {},
}));
import { ForbiddenException } from '@nestjs/common';
import { CardService } from './card.service';

describe('책 카드의 반응 개수', () => {
  function setup(ownerId = 7) {
    const qb: any = {};
    for (const method of [
      'where',
      'andWhere',
      'orderBy',
      'take',
      'addSelect',
    ]) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getRawAndEntities = jest.fn().mockResolvedValue({
      entities: [{ id: 3 }, { id: 2 }, { id: 1 }],
      raw: [
        { card_id: 1, reflectionCount: '1' },
        { card_id: 3, reflectionCount: '2' },
        { card_id: 2, reflectionCount: '0' },
      ],
    });
    const books = {
      findOne: jest.fn().mockResolvedValue({ id: 10, user: { id: ownerId } }),
    };
    const cards = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const service = new CardService(
      {} as any,
      books as any,
      cards as any,
      {} as any,
      {} as any,
    );
    return { service, cards };
  }

  it('페이지 순서와 커서를 유지하며 카드별 개수를 숫자로 반환한다', async () => {
    const { service } = setup();
    expect(await service.getBookCards(7, 10, { take: 2 })).toEqual({
      items: [
        { id: 3, reflectionCount: 2 },
        { id: 2, reflectionCount: 0 },
      ],
      nextCursor: 2,
      hasNext: true,
    });
  });

  it('다른 사용자의 책은 카드와 반응 개수를 조회하지 않는다', async () => {
    const { service, cards } = setup(8);
    await expect(service.getBookCards(7, 10, {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(cards.createQueryBuilder).not.toHaveBeenCalled();
  });
});
