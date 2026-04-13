import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKakaoAuthProvider1776300000000 implements MigrationInterface {
  name = 'AddKakaoAuthProvider1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."user_provider_enum"
      ADD VALUE IF NOT EXISTS 'kakao'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."user_provider_enum" RENAME TO "user_provider_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."user_provider_enum" AS ENUM('google')
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "provider"
      TYPE "public"."user_provider_enum"
      USING "provider"::text::"public"."user_provider_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."user_provider_enum_old"
    `);
  }
}
