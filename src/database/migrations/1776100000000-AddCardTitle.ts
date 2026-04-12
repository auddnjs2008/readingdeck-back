import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCardTitle1776100000000 implements MigrationInterface {
  name = 'AddCardTitle1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "card" ADD "title" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "title"`);
  }
}
