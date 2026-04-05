import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiChatUsage1775900000000 implements MigrationInterface {
  name = 'AddAiChatUsage1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_chat_usage" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "date" date NOT NULL,
        "count" integer NOT NULL DEFAULT '0',
        CONSTRAINT "PK_ai_chat_usage_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_chat_usage_userId" ON "ai_chat_usage" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ai_chat_usage_userId_date" ON "ai_chat_usage" ("userId", "date") `,
    );
    await queryRunner.query(`
      ALTER TABLE "ai_chat_usage"
      ADD CONSTRAINT "FK_ai_chat_usage_userId"
      FOREIGN KEY ("userId") REFERENCES "user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_chat_usage" DROP CONSTRAINT "FK_ai_chat_usage_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_chat_usage_userId_date"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_chat_usage_userId"`);
    await queryRunner.query(`DROP TABLE "ai_chat_usage"`);
  }
}
