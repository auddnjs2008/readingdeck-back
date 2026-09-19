// Run against a disposable local PostgreSQL, never the application database:
// QUOTA_TEST_DATABASE_URL=postgresql://localhost:55439/postgres pnpm exec ts-node -r tsconfig-paths/register test/ai-chat-usage.integration.ts
import * as assert from 'node:assert/strict';
import { DataSource } from 'typeorm';
import { AiChatUsageService } from '../src/ai/ai-chat-usage.service';
import { AiChatUsage } from '../src/ai/entity/ai-chat-usage.entity';
import { AddAiChatUsage1775900000000 } from '../src/database/migrations/1775900000000-AddAiChatUsage';

async function main() {
  assert.ok(
    process.env.QUOTA_TEST_DATABASE_URL,
    'Explicit disposable database URL required',
  );
  const schema = `quota_test_${process.pid}`;
  const database = new DataSource({
    type: 'postgres',
    url: process.env.QUOTA_TEST_DATABASE_URL,
    extra: { max: 20, options: `-c search_path=${schema}` },
  });
  await database.initialize();
  try {
    await database.query(`CREATE SCHEMA "${schema}"`);
    await database.query('CREATE TABLE "user" (id integer PRIMARY KEY)');
    await database.query('INSERT INTO "user" VALUES (7)');
    const runner = database.createQueryRunner();
    try {
      await new AddAiChatUsage1775900000000().up(runner);
    } finally {
      await runner.release();
    }
    const usage = new AiChatUsageService(database.getRepository(AiChatUsage));
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => usage.reserve(7)),
    );
    const accepted = results.filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === 'fulfilled',
    );
    assert.equal(accepted.length, 10);
    assert.equal(
      results.filter(
        (result) =>
          result.status === 'rejected' && result.reason.getStatus() === 429,
      ).length,
      10,
    );
    const count = async () => {
      const rows: { count: number }[] = await database.query(
        'SELECT count FROM ai_chat_usage',
      );
      return rows[0].count;
    };
    assert.equal(await count(), 10);
    await usage.refund(7, accepted[0].value);
    await usage.reserve(7);
    assert.equal(await count(), 10);
    await Promise.all(
      Array.from({ length: 12 }, () => usage.refund(7, accepted[0].value)),
    );
    assert.equal(await count(), 0);
    console.log(
      'PASS: 20 concurrent requests accept exactly 10; refund restores capacity and never makes count negative.',
    );
  } finally {
    try {
      await database.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await database.destroy();
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
