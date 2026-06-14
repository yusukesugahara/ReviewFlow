import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenCorrectionUniqueIndex1781400000000 implements MigrationInterface {
  name = 'AddOpenCorrectionUniqueIndex1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = (await queryRunner.query(`
      SELECT "tenant_id", "application_id", COUNT(*)::int AS "count"
      FROM "correction_requests"
      WHERE "status" = 'open'
      GROUP BY "tenant_id", "application_id"
      HAVING COUNT(*) > 1
      LIMIT 10
    `)) as Array<{
      tenant_id: string;
      application_id: string;
      count: number;
    }>;
    if (duplicates.length > 0) {
      const samples = duplicates
        .map(
          (row) =>
            `${row.tenant_id}/${row.application_id} has ${row.count} open corrections`,
        )
        .join(', ');
      throw new Error(
        `Cannot add open correction unique index because duplicate open corrections exist: ${samples}`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_correction_requests_open_application"
      ON "correction_requests" ("tenant_id", "application_id")
      WHERE "status" = 'open'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_correction_requests_open_application"
    `);
  }
}
