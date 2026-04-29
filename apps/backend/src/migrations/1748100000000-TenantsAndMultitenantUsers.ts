import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/** 既存 users 行を紐づける既定テナント（移行専用） */
const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

export class TenantsAndMultitenantUsers1748100000000 implements MigrationInterface {
  name = 'TenantsAndMultitenantUsers1748100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const type = queryRunner.connection.options.type;

    if (!(await queryRunner.hasTable('tenants'))) {
      if (type === 'better-sqlite3') {
        await queryRunner.query(`
          CREATE TABLE "tenants" (
            "id" varchar(36) PRIMARY KEY NOT NULL,
            "name" varchar(255) NOT NULL,
            "plan" varchar(32) NOT NULL DEFAULT 'free',
            "status" varchar(32) NOT NULL DEFAULT 'trial',
            "created_at" datetime NOT NULL DEFAULT (datetime('now')),
            "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
          )
        `);
      } else {
        await queryRunner.query(`
          CREATE TABLE \`tenants\` (
            \`id\` varchar(36) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`plan\` varchar(32) NOT NULL DEFAULT 'free',
            \`status\` varchar(32) NOT NULL DEFAULT 'trial',
            \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB
        `);
      }
    }

    if (type === 'better-sqlite3') {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "tenants" ("id", "name", "plan", "status") VALUES (?, 'Migrated workspace', 'free', 'active')`,
        [DEFAULT_TENANT_ID],
      );
    } else {
      await queryRunner.query(
        `INSERT IGNORE INTO \`tenants\` (\`id\`, \`name\`, \`plan\`, \`status\`) VALUES (?, 'Migrated workspace', 'free', 'active')`,
        [DEFAULT_TENANT_ID],
      );
    }

    if (type === 'mysql' || type === 'mariadb') {
      await this.upMysql(queryRunner);
    } else if (type === 'better-sqlite3') {
      await this.upSqlite(queryRunner);
    }
  }

  private async upMysql(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('users', 'tenant_id'))) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`tenant_id\` varchar(36) NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`name\` varchar(255) NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`is_active\` tinyint(1) NOT NULL DEFAULT 1`,
      );
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      );
    }

    await queryRunner.query(
      `UPDATE \`users\` SET \`tenant_id\` = COALESCE(\`tenant_id\`, ?), \`role\` = CASE \`role\` WHEN 'admin' THEN 'tenant_admin' WHEN 'user' THEN 'tenant_user' ELSE \`role\` END`,
      [DEFAULT_TENANT_ID],
    );

    await queryRunner.query(
      `ALTER TABLE \`users\` MODIFY \`tenant_id\` varchar(36) NOT NULL`,
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

  private async upSqlite(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('users', 'tenant_id')) {
      return;
    }

    await queryRunner.query(`PRAGMA foreign_keys = OFF`);

    await queryRunner.query(`
      CREATE TABLE "users_new" (
        "id" varchar PRIMARY KEY NOT NULL,
        "tenant_id" varchar(36) NOT NULL,
        "name" varchar(255),
        "email" varchar NOT NULL,
        "password_hash" varchar NOT NULL,
        "role" varchar(32) NOT NULL,
        "is_active" integer NOT NULL DEFAULT 1,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `
      INSERT INTO "users_new" ("id", "tenant_id", "name", "email", "password_hash", "role", "is_active", "created_at", "updated_at")
      SELECT
        "id",
        ? AS "tenant_id",
        NULL AS "name",
        "email",
        "password_hash",
        CASE "role" WHEN 'admin' THEN 'tenant_admin' WHEN 'user' THEN 'tenant_user' ELSE "role" END,
        1,
        "created_at",
        datetime('now')
      FROM "users"
    `,
      [DEFAULT_TENANT_ID],
    );

    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`ALTER TABLE "users_new" RENAME TO "users"`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_tenant_email" ON "users" ("tenant_id", "email")`,
    );

    await queryRunner.query(`PRAGMA foreign_keys = ON`);
  }

  public async down(): Promise<void> {
    /* 本番データ破壊を避けるため未実装 */
  }
}
