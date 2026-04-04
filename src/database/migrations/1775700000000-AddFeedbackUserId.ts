import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbackUserId1775700000000 implements MigrationInterface {
  name = 'AddFeedbackUserId1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "feedback" ADD "userId" integer`);
    await queryRunner.query(
      `CREATE INDEX "IDX_feedback_userId" ON "feedback" ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_feedback_userId"`);
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "userId"`);
  }
}
