import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCardEmbedding1775800000000 implements MigrationInterface {
  name = 'AddCardEmbedding1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS
vector`);

    await queryRunner.query(`
      CREATE TABLE "card_embedding" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "id" SERIAL NOT NULL,
        "cardId" integer NOT NULL,
        "userId" integer NOT NULL,
        "bookId" integer,
        "content" text NOT NULL,
        "embeddingModel" character varying(100) NOT NULL,
        "embedding" vector(1536) NOT NULL,
        CONSTRAINT "PK_card_embedding_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_card_embedding_cardId" UNIQUE ("cardId")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_card_embedding_userId" ON
"card_embedding" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_card_embedding_bookId" ON
"card_embedding" ("bookId")`,
    );

    await queryRunner.query(`
      ALTER TABLE "card_embedding"
      ADD CONSTRAINT "FK_card_embedding_cardId"
      FOREIGN KEY ("cardId") REFERENCES "card"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "card_embedding"
      ADD CONSTRAINT "FK_card_embedding_userId"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "card_embedding"
      ADD CONSTRAINT "FK_card_embedding_bookId"
      FOREIGN KEY ("bookId") REFERENCES "book"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "card_embedding" DROP CONSTRAINT
"FK_card_embedding_bookId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_embedding" DROP CONSTRAINT
"FK_card_embedding_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_embedding" DROP CONSTRAINT
"FK_card_embedding_cardId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_card_embedding_bookId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_card_embedding_userId"`);
    await queryRunner.query(`DROP TABLE "card_embedding"`);
  }
}
