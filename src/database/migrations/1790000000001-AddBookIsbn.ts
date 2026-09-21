import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddBookIsbn1790000000001 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE "book" ADD "isbn" varchar(13)');
    await runner.query(
      'CREATE UNIQUE INDEX "UQ_book_user_isbn" ON "book" ("userId", "isbn") WHERE "isbn" IS NOT NULL',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX "UQ_book_user_isbn"');
    await runner.query('ALTER TABLE "book" DROP COLUMN "isbn"');
  }
}
