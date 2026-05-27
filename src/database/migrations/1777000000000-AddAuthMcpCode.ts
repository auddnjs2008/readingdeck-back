import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthMcpCode1777000000000 implements MigrationInterface {
  name = 'AddAuthMcpCode1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_mcp_code" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL,
        "id" SERIAL NOT NULL,
        "codeHash" character varying(64) NOT NULL,
        "userId" integer NOT NULL,
        "provider" "public"."user_provider_enum" NOT NULL,
        "redirectUri" character varying(500) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        CONSTRAINT "UQ_auth_mcp_code_codeHash" UNIQUE ("codeHash"),
        CONSTRAINT "PK_auth_mcp_code_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_mcp_code_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_mcp_code_codeHash"
      ON "auth_mcp_code" ("codeHash")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_mcp_code_userId"
      ON "auth_mcp_code" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_mcp_code_expiresAt"
      ON "auth_mcp_code" ("expiresAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_auth_mcp_code_expiresAt"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_auth_mcp_code_userId"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_auth_mcp_code_codeHash"
    `);

    await queryRunner.query(`
      DROP TABLE "auth_mcp_code"
    `);
  }
}
