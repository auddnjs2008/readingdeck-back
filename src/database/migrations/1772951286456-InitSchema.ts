import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1772951286456 implements MigrationInterface {
  name = 'InitSchema1772951286456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "deck_connection" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "deckId" integer NOT NULL, "fromNodeId" integer NOT NULL, "toNodeId" integer NOT NULL, "type" character varying(50), "style" json, "animated" boolean NOT NULL DEFAULT false, "markerEnd" json, "sourceHandle" character varying(100), "targetHandle" character varying(100), "label" character varying(255), CONSTRAINT "UQ_7b22825f5bfed76573bfcace8cb" UNIQUE ("deckId", "fromNodeId", "toNodeId"), CONSTRAINT "PK_54037dd6b3b711ae752a38a9099" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f7b8c0ed763631d7e59abefc1" ON "deck_connection" ("deckId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deck_status_enum" AS ENUM('draft', 'published')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deck_mode_enum" AS ENUM('list', 'graph')`,
    );
    await queryRunner.query(
      `CREATE TABLE "deck" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "name" character varying(255) NOT NULL DEFAULT 'Untitled Deck', "userId" integer NOT NULL, "status" "public"."deck_status_enum" NOT NULL DEFAULT 'draft', "mode" "public"."deck_mode_enum" NOT NULL DEFAULT 'graph', "preview" jsonb, "previewUpdatedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_99f8010303acab0edf8e1df24f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deck_node_type_enum" AS ENUM('book', 'card')`,
    );
    await queryRunner.query(
      `CREATE TABLE "deck_node" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "deckId" integer NOT NULL, "type" "public"."deck_node_type_enum" NOT NULL, "clientKey" character varying(100), "bookId" integer, "cardId" integer, "positionX" double precision NOT NULL DEFAULT '0', "positionY" double precision NOT NULL DEFAULT '0', "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_2be6e41a521fae3bb4a4ba8bc74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fafb5af0d790c63a30475e15e6" ON "deck_node" ("deckId", "clientKey") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6039e2006ca7074174a2bf4179" ON "deck_node" ("deckId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."card_type_enum" AS ENUM('insight', 'change', 'action', 'question')`,
    );
    await queryRunner.query(
      `CREATE TABLE "card" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "type" "public"."card_type_enum" NOT NULL, "quote" text, "thought" text NOT NULL, "backgroundImage" character varying, "pageStart" integer, "pageEnd" integer, "bookId" integer, CONSTRAINT "PK_9451069b6f1199730791a7f4ae4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "book" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "title" character varying NOT NULL, "author" character varying NOT NULL, "contents" character varying, "publisher" character varying NOT NULL, "backgroundImage" character varying, "userId" integer, CONSTRAINT "PK_a3afef72ec8f80e6e5c310b28a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_provider_enum" AS ENUM('google')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, "email" character varying(255), "provider" "public"."user_provider_enum" NOT NULL, "profile" character varying, "providerUserId" character varying(100) NOT NULL, CONSTRAINT "UQ_bbaf6a936b2124dc6448ba3448f" UNIQUE ("provider", "providerUserId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d223b6ab8859d668ab080c3628" ON "user" ("providerUserId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_connection" ADD CONSTRAINT "FK_2f7b8c0ed763631d7e59abefc1e" FOREIGN KEY ("deckId") REFERENCES "deck"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_connection" ADD CONSTRAINT "FK_471e17d4cd51eb74e5ca4441b26" FOREIGN KEY ("fromNodeId") REFERENCES "deck_node"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_connection" ADD CONSTRAINT "FK_ce324388911d77313deb521d741" FOREIGN KEY ("toNodeId") REFERENCES "deck_node"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" ADD CONSTRAINT "FK_09e8a376bab70b9737c839b2e24" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_node" ADD CONSTRAINT "FK_6039e2006ca7074174a2bf41795" FOREIGN KEY ("deckId") REFERENCES "deck"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_node" ADD CONSTRAINT "FK_e09f651e01d7292a3949383fb59" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_node" ADD CONSTRAINT "FK_274b3c60c481a4045aa0a023f01" FOREIGN KEY ("cardId") REFERENCES "card"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "card" ADD CONSTRAINT "FK_17721594c19434959b6d4585465" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "book" ADD CONSTRAINT "FK_04f66cf2a34f8efc5dcd9803693" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "book" DROP CONSTRAINT "FK_04f66cf2a34f8efc5dcd9803693"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card" DROP CONSTRAINT "FK_17721594c19434959b6d4585465"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_node" DROP CONSTRAINT "FK_274b3c60c481a4045aa0a023f01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_node" DROP CONSTRAINT "FK_e09f651e01d7292a3949383fb59"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_node" DROP CONSTRAINT "FK_6039e2006ca7074174a2bf41795"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck" DROP CONSTRAINT "FK_09e8a376bab70b9737c839b2e24"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_connection" DROP CONSTRAINT "FK_ce324388911d77313deb521d741"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_connection" DROP CONSTRAINT "FK_471e17d4cd51eb74e5ca4441b26"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deck_connection" DROP CONSTRAINT "FK_2f7b8c0ed763631d7e59abefc1e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d223b6ab8859d668ab080c3628"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_provider_enum"`);
    await queryRunner.query(`DROP TABLE "book"`);
    await queryRunner.query(`DROP TABLE "card"`);
    await queryRunner.query(`DROP TYPE "public"."card_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6039e2006ca7074174a2bf4179"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fafb5af0d790c63a30475e15e6"`,
    );
    await queryRunner.query(`DROP TABLE "deck_node"`);
    await queryRunner.query(`DROP TYPE "public"."deck_node_type_enum"`);
    await queryRunner.query(`DROP TABLE "deck"`);
    await queryRunner.query(`DROP TYPE "public"."deck_mode_enum"`);
    await queryRunner.query(`DROP TYPE "public"."deck_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f7b8c0ed763631d7e59abefc1"`,
    );
    await queryRunner.query(`DROP TABLE "deck_connection"`);
  }
}
