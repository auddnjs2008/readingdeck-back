import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1773180105236 implements MigrationInterface {
  name = 'InitSchema1773180105236';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "deck" ADD "description" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "deck" DROP COLUMN "description"`);
  }
}
