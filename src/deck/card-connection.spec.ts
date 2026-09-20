import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DeckService } from './deck.service';
import { Deck } from './entity/deck.entity';
import { DeckNode } from 'src/deck-node/entity/deck-node.entity';
import { DeckConnection } from 'src/deck-connection/entity/deck-connection.entity';
import { Card } from 'src/card/entity/card.entity';
import { CommunityPost } from 'src/community/entity/community-post.entity';

jest.mock('../common/service/s3.service', () => ({ S3Service: class {} }));

describe('카드 연결 저장', () => {
  it('같은 카드가 여러 노드에 있어도 기존 카드 쌍 연결을 재사용한다', async () => {
    const { service, nodes, edges } = setup();
    nodes.push(
      { id: 2, cardId: 2, type: 'card', order: 1 },
      { id: 3, cardId: 1, type: 'card', order: 2 },
    );
    edges.push({ id: 1, fromNodeId: 3, toNodeId: 2, label: '원래 관계' });
    const result = await service.addCardConnection(7, 5, {
      fromCardId: 1,
      toCardId: 2,
      relation: 'similar',
    });
    expect(result.alreadyConnected).toBe(true);
    expect(result.connection.label).toBe('원래 관계');
    expect(edges).toHaveLength(1);
  });
  it('오래된 편집 화면은 발행으로 버전 검사를 우회할 수 없다', async () => {
    const { service } = setup();
    await expect(
      service.publishDeck(7, 5, { expectedVersion: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  function setup() {
    const deck = {
      id: 5,
      userId: 7,
      status: 'draft',
      mode: 'graph',
      version: 2,
    };
    const nodes: any[] = [
      {
        id: 1,
        cardId: 1,
        type: 'card',
        positionX: 20,
        positionY: 30,
        order: 0,
      },
    ];
    const edges: any[] = [];
    const repo = (rows: any[]) => ({
      find: jest.fn(async () => [...rows]),
      create: (value: any) => value,
      save: jest.fn(async (value: any) => {
        const saved = { id: rows.length + 1, ...value };
        rows.push(saved);
        return saved;
      }),
    });
    const decks = {
      findOne: jest.fn(async () => deck),
      save: jest.fn(async (value: any) => ({ ...value, version: 3 })),
    };
    const cards = {
      find: jest.fn(async () => [
        { id: 1, book: { id: 10, user: { id: 7 } } },
        { id: 2, book: { id: 11, user: { id: 7 } } },
      ]),
    };
    const posts = { existsBy: jest.fn(async () => false) };
    const repositories = new Map<any, any>([
      [Deck, decks],
      [DeckNode, repo(nodes)],
      [DeckConnection, repo(edges)],
      [Card, cards],
      [CommunityPost, posts],
    ]);
    const manager = {
      getRepository: (entity: any) => repositories.get(entity),
    };
    const source = { transaction: async (run: any) => run(manager) };
    const service = new DeckService(
      decks as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      cards as any,
      posts as any,
      {} as any,
      source as any,
    );
    jest
      .spyOn(service as any, 'buildDeckPreview')
      .mockResolvedValue({ kind: 'graph' });
    return { service, deck, nodes, edges, cards };
  }
  it('기존 노드를 보존하고 반복 요청은 연결을 중복 생성하지 않는다', async () => {
    const { service, nodes, edges } = setup();
    const input = { fromCardId: 1, toCardId: 2, relation: 'similar' as const };
    await service.addCardConnection(7, 5, input);
    await service.addCardConnection(7, 5, input);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ id: 1, positionX: 20, positionY: 30 });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      fromNodeId: 1,
      toNodeId: 2,
      type: 'similar',
      label: '비슷해요',
    });
  });
  it('타인 소유 덱에는 연결을 추가할 수 없다', async () => {
    const { service, edges } = setup();
    await expect(
      service.addCardConnection(8, 5, {
        fromCardId: 1,
        toCardId: 2,
        relation: 'similar',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(edges).toHaveLength(0);
  });
  it('같은 책의 카드는 연결하지 않는다', async () => {
    const { service, cards } = setup();
    cards.find.mockResolvedValue([
      { id: 1, book: { id: 10, user: { id: 7 } } },
      { id: 2, book: { id: 10, user: { id: 7 } } },
    ]);
    await expect(
      service.addCardConnection(7, 5, {
        fromCardId: 1,
        toCardId: 2,
        relation: 'similar',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('오래된 버전으로 전체 그래프를 저장하면 충돌을 반환한다', async () => {
    const { service } = setup();
    await expect(
      service.updateDeckGraph(7, 5, {
        nodes: [],
        connections: [],
        expectedVersion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
