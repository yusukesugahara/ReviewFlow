import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicantEmailToApplications1760000000000
  implements MigrationInterface
{
  name = 'AddApplicantEmailToApplications1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "applications" ADD COLUMN "applicant_email" varchar(255)',
    );
    await queryRunner.query(
      'UPDATE "applications" SET "applicant_email" = (SELECT "email" FROM "users" WHERE "users"."id" = "applications"."applicant_user_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "applications" DROP COLUMN "applicant_email"',
    );
  }
}
