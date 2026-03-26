import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommunityPost1774396800000 implements MigrationInterface {
  name = 'AddCommunityPost1774396800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "community_post" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "userId" integer NOT NULL, "deckId" integer NOT NULL, "caption" text, "deckName" character varying(255) NOT NULL, "deckDescription" text, "deckMode" "public"."deck_mode_enum" NOT NULL, "preview" jsonb NOT NULL, "snapshot" jsonb NOT NULL, "primaryCardType" "public"."card_type_enum", "primaryQuote" text, "primaryThought" text NOT NULL, "bookTitle" character varying(255), "bookAuthor" character varying(255), CONSTRAINT "UQ_community_post_deckId" UNIQUE ("deckId"), CONSTRAINT "PK_0e386ba9ef4e8fb8c0719ccb495" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_post_user_created" ON "community_post" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_post_deckId" ON "community_post" ("deckId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "community_post" ADD CONSTRAINT "FK_community_post_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "community_post" ADD CONSTRAINT "FK_community_post_deck" FOREIGN KEY ("deckId") REFERENCES "deck"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "community_post" DROP CONSTRAINT "FK_community_post_deck"`,
    );
    await queryRunner.query(
      `ALTER TABLE "community_post" DROP CONSTRAINT "FK_community_post_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_community_post_deckId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_community_post_user_created"`,
    );
    await queryRunner.query(`DROP TABLE "community_post"`);
  }
}
