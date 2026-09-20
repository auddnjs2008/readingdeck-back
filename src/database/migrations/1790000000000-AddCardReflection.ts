import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCardReflection1790000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "card_reflection" (
      "id" SERIAL PRIMARY KEY, "cardId" integer NOT NULL REFERENCES "card"("id") ON DELETE CASCADE,
      "reaction" varchar(20) NOT NULL, "note" varchar(500), "requestId" uuid NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "UQ_reflection_request" UNIQUE ("cardId", "requestId")
    )`);
    await runner.query(
      `CREATE INDEX "IDX_reflection_card_id" ON "card_reflection" ("cardId", "id")`,
    );
    await runner.query(`ALTER TABLE "deck" ADD "requestId" uuid`);
    await runner.query(
      `CREATE UNIQUE INDEX "UQ_deck_user_request" ON "deck" ("userId", "requestId")`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX "UQ_deck_user_request"`);
    await runner.query(`ALTER TABLE "deck" DROP COLUMN "requestId"`);
    await runner.query(`DROP TABLE "card_reflection"`);
  }
}
