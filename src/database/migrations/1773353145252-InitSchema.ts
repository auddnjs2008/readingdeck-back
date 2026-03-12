import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1773353145252 implements MigrationInterface {
    name = 'InitSchema1773353145252'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "card" ADD "lastRevisitedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "card" ADD "revisitCount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "revisitCount"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "lastRevisitedAt"`);
    }

}
