import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

const auditEventColumns = [
  new TableColumn({
    name: 'scope_type',
    type: 'varchar',
    length: '32',
    isNullable: true,
  }),
  new TableColumn({
    name: 'scope_id',
    type: 'varchar',
    length: '128',
    isNullable: true,
  }),
  new TableColumn({
    name: 'resource_type',
    type: 'varchar',
    length: '128',
    isNullable: true,
  }),
  new TableColumn({
    name: 'resource_id',
    type: 'varchar',
    length: '128',
    isNullable: true,
  }),
  new TableColumn({
    name: 'resource_label_snapshot',
    type: 'varchar',
    length: '255',
    isNullable: true,
  }),
  new TableColumn({
    name: 'operation',
    type: 'varchar',
    length: '64',
    isNullable: true,
  }),
  new TableColumn({
    name: 'outcome',
    type: 'varchar',
    length: '32',
    default: "'success'",
    isNullable: false,
  }),
  new TableColumn({
    name: 'actor_json',
    type: 'json',
    isNullable: true,
  }),
  new TableColumn({
    name: 'resource_json',
    type: 'json',
    isNullable: true,
  }),
  new TableColumn({
    name: 'changes_json',
    type: 'json',
    isNullable: true,
  }),
];

export class AddGenericAuditEventColumns1782600000000 implements MigrationInterface {
  name = 'AddGenericAuditEventColumns1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of auditEventColumns) {
      const exists = await queryRunner.hasColumn('audit_logs', column.name);
      if (!exists) {
        await queryRunner.addColumn('audit_logs', column);
      }
    }

    await queryRunner.query(`
      UPDATE "audit_logs"
         SET "scope_type" = COALESCE(
               "scope_type",
               CASE WHEN "group_id" IS NOT NULL THEN 'space' ELSE 'tenant' END
             ),
             "scope_id" = COALESCE(
               "scope_id",
               COALESCE(CAST("group_id" AS text), CAST("tenant_id" AS text))
             ),
             "resource_type" = COALESCE("resource_type", "target_type"),
             "resource_id" = COALESCE("resource_id", "target_id"),
             "resource_label_snapshot" = COALESCE(
               "resource_label_snapshot",
               "target_email_snapshot",
               "target_id"
             ),
             "operation" = COALESCE(
               "operation",
               regexp_replace("action_type", '^[^.]+\\.', '')
             ),
             "outcome" = COALESCE("outcome", 'success'),
             "actor_json" = COALESCE(
               "actor_json",
               json_build_object(
                 'type', COALESCE("actor_type", 'user'),
                 'id', CAST("actor_user_id" AS text),
                 'label', "actor_email_snapshot",
                 'email', "actor_email_snapshot"
               )
             ),
             "resource_json" = COALESCE(
               "resource_json",
               json_build_object(
                 'type', "target_type",
                 'id', "target_id",
                 'label', COALESCE("target_email_snapshot", "target_id")
               )
             ),
             "changes_json" = COALESCE("changes_json", '[]'::json)
    `);

    await createIndexIfMissing(
      queryRunner,
      new TableIndex({
        name: 'IDX_audit_logs_tenant_resource_created',
        columnNames: ['tenant_id', 'resource_type', 'created_at'],
      }),
    );
    await createIndexIfMissing(
      queryRunner,
      new TableIndex({
        name: 'IDX_audit_logs_tenant_scope_created',
        columnNames: ['tenant_id', 'scope_type', 'scope_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_audit_logs_tenant_scope_created"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_audit_logs_tenant_resource_created"',
    );

    for (const column of [...auditEventColumns].reverse()) {
      const exists = await queryRunner.hasColumn('audit_logs', column.name);
      if (exists) {
        await queryRunner.dropColumn('audit_logs', column.name);
      }
    }
  }
}

async function createIndexIfMissing(
  queryRunner: QueryRunner,
  index: TableIndex,
): Promise<void> {
  const table = await queryRunner.getTable('audit_logs');
  if (table?.indices.some((existing) => existing.name === index.name)) {
    return;
  }
  await queryRunner.createIndex('audit_logs', index);
}
