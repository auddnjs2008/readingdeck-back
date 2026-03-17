import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBookReadingProgress1775000000000 implements MigrationInterface {
    name = 'AddBookReadingProgress1775000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."book_status_enum" AS ENUM('reading', 'finished', 'paused')`);
        await queryRunner.query(`ALTER TABLE "book" ADD "status" "public"."book_status_enum" NOT NULL DEFAULT 'paused'`);
        await queryRunner.query(`ALTER TABLE "book" ADD "currentPage" integer`);
        await queryRunner.query(`ALTER TABLE "book" ADD "totalPages" integer`);
        await queryRunner.query(`ALTER TABLE "book" ADD "startedAt" TIMESTAMPTZ`);
        await queryRunner.query(`ALTER TABLE "book" ADD "finishedAt" TIMESTAMPTZ`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "finishedAt"`);
        await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "startedAt"`);
        await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "totalPages"`);
        await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "currentPage"`);
        await queryRunner.query(`ALTER TABLE "book" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."book_status_enum"`);
    }
}
