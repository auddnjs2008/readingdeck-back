import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiHelpDocument1776200000000 implements MigrationInterface {
  name = 'AddAiHelpDocument1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_help_document" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "id" SERIAL NOT NULL,
        "slug" character varying(120) NOT NULL,
        "title" character varying(255) NOT NULL,
        "summary" text NOT NULL,
        "content" text NOT NULL,
        "contentHash" character varying(64) NOT NULL,
        "embeddingModel" character varying(100) NOT NULL,
        "embedding" vector(1536) NOT NULL,
        CONSTRAINT "UQ_ai_help_document_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_ai_help_document_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_help_document_slug"
      ON "ai_help_document" ("slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_ai_help_document_slug"
    `);

    await queryRunner.query(`
      DROP TABLE "ai_help_document"
    `);
  }
}
