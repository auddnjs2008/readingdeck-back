import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedback1775600000000 implements MigrationInterface {
  name = 'AddFeedback1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "feedback" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "message" text NOT NULL, "pagePath" character varying(255), CONSTRAINT "PK_8389f9a1848098f1ec8d2e9214b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_feedback_createdAt" ON "feedback" ("createdAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_feedback_createdAt"`);
    await queryRunner.query(`DROP TABLE "feedback"`);
  }
}
