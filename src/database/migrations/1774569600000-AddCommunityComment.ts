import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommunityComment1774569600000 implements MigrationInterface {
  name = 'AddCommunityComment1774569600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "community_comment" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" integer NOT NULL, "id" SERIAL NOT NULL, "postId" integer NOT NULL, "userId" integer NOT NULL, "parentId" integer, "content" text NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_eeecdc80e2903f211435d2a9c3e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_comment_post_created" ON "community_comment" ("postId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_community_comment_parent" ON "community_comment" ("parentId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "community_comment" ADD CONSTRAINT "FK_community_comment_post" FOREIGN KEY ("postId") REFERENCES "community_post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "community_comment" ADD CONSTRAINT "FK_community_comment_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "community_comment" ADD CONSTRAINT "FK_community_comment_parent" FOREIGN KEY ("parentId") REFERENCES "community_comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "community_comment" DROP CONSTRAINT "FK_community_comment_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "community_comment" DROP CONSTRAINT "FK_community_comment_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "community_comment" DROP CONSTRAINT "FK_community_comment_post"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_community_comment_parent"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_community_comment_post_created"`,
    );
    await queryRunner.query(`DROP TABLE "community_comment"`);
  }
}
