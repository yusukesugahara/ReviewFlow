import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/** 既存 users 行を紐づける既定テナント（移行専用） */
const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export class TenantsAndMultitenantUsers1748100000000
  implements MigrationInterface
{
  name = 'TenantsAndMultitenantUsers1748100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('tenants'))) {
      await queryRunner.query(`
        CREATE TABLE "tenants" (
          "id" varchar(36) PRIMARY KEY NOT NULL,
          "name" varchar(255) NOT NULL,
          "plan" varchar(32) NOT NULL DEFAULT 'free',
          "status" varchar(32) NOT NULL DEFAULT 'trial',
          "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    await queryRunner.query(
      `
      INSERT INTO "tenants" ("id", "name", "plan", "status")
      VALUES ($1, 'Migrated workspace', 'free', 'active')
      ON CONFLICT ("id") DO NOTHING
      `,
      [DEFAULT_TENANT_ID],
    );

    if (!(await queryRunner.hasColumn('users', 'tenant_id'))) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "tenant_id" varchar(36) NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "users" ADD "name" varchar(255) NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "users" ADD "is_active" boolean NOT NULL DEFAULT true`,
      );
      await queryRunner.query(
        `ALTER TABLE "users" ADD "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
    }

    await queryRunner.query(
      `
      UPDATE "users"
      SET
        "tenant_id" = COALESCE("tenant_id", $1),
        "role" = CASE "role"
          WHEN 'admin' THEN 'tenant_admin'
          WHEN 'user' THEN 'tenant_user'
          ELSE "role"
        END
      `,
      [DEFAULT_TENANT_ID],
    );

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL`,
    );

    const table = await queryRunner.getTable('users');
    const emailOnlyUnique = table?.indices.find(
      (i) =>
        i.isUnique &&
        i.columnNames.length === 1 &&
        i.columnNames[0] === 'email',
    );
    if (emailOnlyUnique?.name) {
      await queryRunner.dropIndex('users', emailOnlyUnique.name);
    }

    const refreshed = await queryRunner.getTable('users');
    const fkExists = refreshed?.foreignKeys.some((fk) =>
      fk.columnNames.includes('tenant_id'),
    );
    if (!fkExists) {
      await queryRunner.createForeignKey(
        'users',
        new TableForeignKey({
          columnNames: ['tenant_id'],
          referencedTableName: 'tenants',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    const afterFk = await queryRunner.getTable('users');
    const composite = afterFk?.indices.find(
      (i) => i.name === 'UQ_users_tenant_email',
    );
    if (!composite) {
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'UQ_users_tenant_email',
          columnNames: ['tenant_id', 'email'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(): Promise<void> {
    /* 本番データ破壊を避けるため未実装 */
  }
}
