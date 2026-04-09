import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiChatThreadAndMessage1776000000000 implements MigrationInterface {
  name = 'AddAiChatThreadAndMessage1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
        CREATE TABLE "ai_chat_thread" (
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "version" integer NOT NULL,
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "userId" integer NOT NULL,
          CONSTRAINT "PK_ai_chat_thread_id" PRIMARY KEY ("id")
        )
      `);

    await queryRunner.query(`
        CREATE INDEX "IDX_ai_chat_thread_userId"
        ON "ai_chat_thread" ("userId")
      `);

    await queryRunner.query(`
        ALTER TABLE "ai_chat_thread"
        ADD CONSTRAINT "FK_ai_chat_thread_userId"
        FOREIGN KEY ("userId") REFERENCES "user"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);

    await queryRunner.query(`
        CREATE TYPE "public"."ai_chat_message_role_enum" AS ENUM('user', 'assistant')
      `);

    await queryRunner.query(`
        CREATE TABLE "ai_chat_message" (
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "version" integer NOT NULL,
          "id" SERIAL NOT NULL,
          "threadId" uuid NOT NULL,
          "role" "public"."ai_chat_message_role_enum" NOT NULL,
          "content" text NOT NULL,
          CONSTRAINT "PK_ai_chat_message_id" PRIMARY KEY ("id")
        )
      `);

    await queryRunner.query(`
        CREATE INDEX "IDX_ai_chat_message_threadId"
        ON "ai_chat_message" ("threadId")
      `);

    await queryRunner.query(`
        ALTER TABLE "ai_chat_message"
        ADD CONSTRAINT "FK_ai_chat_message_threadId"
        FOREIGN KEY ("threadId") REFERENCES "ai_chat_thread"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "ai_chat_message" DROP CONSTRAINT "FK_ai_chat_message_threadId"
      `);

    await queryRunner.query(`
        DROP INDEX "public"."IDX_ai_chat_message_threadId"
      `);

    await queryRunner.query(`
        DROP TABLE "ai_chat_message"
      `);

    await queryRunner.query(`
        DROP TYPE "public"."ai_chat_message_role_enum"
      `);

    await queryRunner.query(`
        ALTER TABLE "ai_chat_thread" DROP CONSTRAINT "FK_ai_chat_thread_userId"
      `);

    await queryRunner.query(`
        DROP INDEX "public"."IDX_ai_chat_thread_userId"
      `);

    await queryRunner.query(`
        DROP TABLE "ai_chat_thread"
      `);
  }
}
