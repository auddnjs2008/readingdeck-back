import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbackContact1790000000002 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE "feedback" ADD "category" varchar(16), ADD "replyEmail" varchar(254)',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE "feedback" DROP COLUMN "replyEmail", DROP COLUMN "category"',
    );
  }
}
