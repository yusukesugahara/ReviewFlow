import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

const auditLogColumns = [
  new TableColumn({
    name: 'actor_type',
    type: 'varchar',
    length: '32',
    default: "'user'",
    isNullable: false,
  }),
  new TableColumn({
    name: 'actor_email_snapshot',
    type: 'varchar',
    length: '255',
    isNullable: true,
  }),
  new TableColumn({
    name: 'target_user_id',
    type: 'uuid',
    isNullable: true,
  }),
  new TableColumn({
    name: 'target_email_snapshot',
    type: 'varchar',
    length: '255',
    isNullable: true,
  }),
  new TableColumn({
    name: 'application_id',
    type: 'uuid',
    isNullable: true,
  }),
  new TableColumn({
    name: 'status_from',
    type: 'varchar',
    length: '32',
    isNullable: true,
  }),
  new TableColumn({
    name: 'status_to',
    type: 'varchar',
    length: '32',
    isNullable: true,
  }),
  new TableColumn({
    name: 'step_order_from',
    type: 'int',
    isNullable: true,
  }),
  new TableColumn({
    name: 'step_order_to',
    type: 'int',
    isNullable: true,
  }),
  new TableColumn({
    name: 'role_from',
    type: 'varchar',
    length: '32',
    isNullable: true,
  }),
  new TableColumn({
    name: 'role_to',
    type: 'varchar',
    length: '32',
    isNullable: true,
  }),
  new TableColumn({
    name: 'group_role_from',
    type: 'varchar',
    length: '32',
    isNullable: true,
  }),
  new TableColumn({
    name: 'group_role_to',
    type: 'varchar',
    length: '32',
    isNullable: true,
  }),
  new TableColumn({
    name: 'summary',
    type: 'varchar',
    length: '500',
    isNullable: true,
  }),
];

export class AddBusinessAuditLogColumns1765600000000 implements MigrationInterface {
  name = 'AddBusinessAuditLogColumns1765600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of auditLogColumns) {
      const exists = await queryRunner.hasColumn('audit_logs', column.name);
      if (!exists) {
        await queryRunner.addColumn('audit_logs', column);
      }
    }

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_tenant_application_created',
        columnNames: ['tenant_id', 'application_id', 'created_at'],
      }),
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_tenant_target_user_created',
        columnNames: ['tenant_id', 'target_user_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'audit_logs',
      'IDX_audit_logs_tenant_target_user_created',
    );
    await queryRunner.dropIndex(
      'audit_logs',
      'IDX_audit_logs_tenant_application_created',
    );

    for (const column of [...auditLogColumns].reverse()) {
      const exists = await queryRunner.hasColumn('audit_logs', column.name);
      if (exists) {
        await queryRunner.dropColumn('audit_logs', column.name);
      }
    }
  }
}
