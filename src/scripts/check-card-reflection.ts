// Isolated PostgreSQL verification. No application env files are loaded.
// REFLECTION_TEST_DATABASE_URL=postgresql://... node -r ts-node/register -r tsconfig-paths/register src/scripts/check-card-reflection.ts
import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { User, AuthProvider } from '../user/entity/user.entity';
import { Book } from '../book/entity/book.entity';
import { Card, CardType } from '../card/entity/card.entity';
import { CardReflection } from '../card/entity/card-reflection.entity';
import { Deck, DeckMode, DeckStatus } from '../deck/entity/deck.entity';
import { DeckNode, DeckNodeType } from '../deck-node/entity/deck-node.entity';
import { DeckConnection } from '../deck-connection/entity/deck-connection.entity';
import { CommunityPost } from '../community/entity/community-post.entity';
import { CommunityComment } from '../community/entity/community-comment.entity';
import { CardReflectionService } from '../card/card-reflection.service';
import { DeckService } from '../deck/deck.service';
import { AddCardReflection1790000000000 } from '../database/migrations/1790000000000-AddCardReflection';

async function main() {
  const url = process.env.REFLECTION_TEST_DATABASE_URL;
  assert.ok(url, 'Explicit temporary database URL required');
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(new URL(url).hostname),
    'Local test database only',
  );
  const schema = `reflection_check_${randomUUID().replaceAll('-', '')}`;
  const admin = new DataSource({ type: 'postgres', url });
  await admin.initialize();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const db = new DataSource({
    type: 'postgres',
    url,
    schema,
    extra: { options: `-c search_path=${schema}` },
    entities: [
      User,
      Book,
      Card,
      CardReflection,
      Deck,
      DeckNode,
      DeckConnection,
      CommunityPost,
      CommunityComment,
    ],
    synchronize: true,
  });
  try {
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.connect();
    const migration = new AddCardReflection1790000000000();
    await migration.down(runner);
    await migration.up(runner);
    await runner.release();
    const users = db.getRepository(User);
    const user = await users.save(
      users.create({
        name: 'Test',
        provider: AuthProvider.GOOGLE,
        providerUserId: randomUUID(),
      }),
    );
    const outsider = await users.save(
      users.create({
        name: 'Other',
        provider: AuthProvider.GOOGLE,
        providerUserId: randomUUID(),
      }),
    );
    const books = db.getRepository(Book);
    const first = await books.save(
      books.create({
        title: '첫 책',
        author: '저자',
        publisher: '출판사',
        user,
      }),
    );
    const second = await books.save(
      books.create({
        title: '다른 책',
        author: '저자',
        publisher: '출판사',
        user,
      }),
    );
    const cards = db.getRepository(Card);
    const a = await cards.save(
      cards.create({
        type: CardType.INSIGHT,
        thought: '처음 생각',
        book: first,
      }),
    );
    const b = await cards.save(
      cards.create({
        type: CardType.INSIGHT,
        thought: '연결할 생각',
        book: second,
      }),
    );
    const reflections = new CardReflectionService(
      cards,
      db.getRepository(CardReflection),
      db,
    );
    const request = {
      reaction: 'changed' as const,
      note: '지금의 생각',
      requestId: randomUUID(),
    };
    const results = await Promise.all([
      reflections.create(user.id, a.id, request),
      reflections.create(user.id, a.id, request),
    ]);
    assert.equal(results[0].id, results[1].id);
    assert.equal((await reflections.list(user.id, a.id)).items.length, 1);
    assert.equal(
      (await cards.findOneByOrFail({ id: a.id })).thought,
      '처음 생각',
    );
    await assert.rejects(reflections.list(outsider.id, a.id));
    await assert.rejects(reflections.remove(outsider.id, a.id, results[0].id));

    const decks = new DeckService(
      db.getRepository(Deck),
      db.getRepository(DeckNode),
      db.getRepository(DeckConnection),
      users,
      books,
      cards,
      db.getRepository(CommunityPost),
      { resolvePublicUrl: (value: unknown) => value } as any,
      db,
    );
    const create = {
      name: '생각 연결',
      status: DeckStatus.DRAFT,
      mode: DeckMode.GRAPH,
      requestId: randomUUID(),
      nodes: [a.id, b.id].map((cardId, index) => ({
        type: DeckNodeType.CARD,
        cardId,
        clientKey: `c${index}`,
        positionX: index * 400,
        positionY: 0,
      })),
    };
    const created = await Promise.all([
      decks.createDeck(user.id, create),
      decks.createDeck(user.id, create),
    ]);
    assert.equal(created[0].id, created[1].id);
    const deck = created[0];
    const oldNodes = await db
      .getRepository(DeckNode)
      .findBy({ deckId: deck.id });
    const input = {
      fromCardId: a.id,
      toCardId: b.id,
      relation: 'similar' as const,
    };
    const connected = await Promise.all([
      decks.addCardConnection(user.id, deck.id, input),
      decks.addCardConnection(user.id, deck.id, input),
    ]);
    assert.equal(connected[0].connection.id, connected[1].connection.id);
    assert.deepEqual(
      (await db.getRepository(DeckNode).findBy({ deckId: deck.id })).map(
        (n) => n.id,
      ),
      oldNodes.map((n) => n.id),
    );
    assert.equal(
      await db.getRepository(DeckConnection).countBy({ deckId: deck.id }),
      1,
    );
    await assert.rejects(
      decks.updateDeckGraph(user.id, deck.id, {
        expectedVersion: deck.version,
        nodes: [],
        connections: [],
      }),
      (error: any) => error.getStatus() === 409,
    );
    await assert.rejects(
      decks.publishDeck(user.id, deck.id, { expectedVersion: deck.version }),
      (error: any) => error.getStatus() === 409,
    );
    await assert.rejects(decks.addCardConnection(outsider.id, deck.id, input));
    const fresh = await decks.getDeck(user.id, deck.id);
    assert.equal(fresh.connections[0].label, '비슷해요');
    const metadata = await decks.updateDeck(user.id, deck.id, {
      name: '수정한 덱',
      expectedVersion: fresh.version,
    });
    await decks.updateDeckGraph(user.id, deck.id, {
      expectedVersion: metadata.version,
      nodes: create.nodes,
      connections: [
        { fromNodeClientKey: 'c0', toNodeClientKey: 'c1', label: '비슷해요' },
      ],
    });
    await decks.publishDeck(user.id, deck.id, {
      expectedVersion: (await decks.getDeck(user.id, deck.id)).version,
    });
    await assert.rejects(decks.addCardConnection(user.id, deck.id, input));
    await cards.delete(a.id);
    assert.equal(await db.getRepository(CardReflection).count(), 0);
    console.log(
      'PASS: migration down/up, concurrent reflection/deck/connection retries, ownership, original text preservation, stale graph rejection, metadata→graph save, published deck rejection, cascade deletion',
    );
  } finally {
    if (db.isInitialized) await db.destroy();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.destroy();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
