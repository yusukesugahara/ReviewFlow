import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const groupScopedTables = [
  'form_templates',
  'approval_flows',
  'approval_steps',
  'applications',
  'export_jobs',
];

export class AddGroupScopeToBusinessData1765200000000 implements MigrationInterface {
  name = 'AddGroupScopeToBusinessData1765200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of groupScopedTables) {
      await queryRunner.addColumn(
        table,
        new TableColumn({
          name: 'group_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        }),
      );
      await queryRunner.createForeignKey(
        table,
        new TableForeignKey({
          columnNames: ['group_id'],
          referencedTableName: 'groups',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
      await queryRunner.createIndex(
        table,
        new TableIndex({
          name: `IDX_${table}_tenant_group`,
          columnNames: ['tenant_id', 'group_id'],
        }),
      );
    }

    await queryRunner.addColumn(
      'audit_logs',
      new TableColumn({
        name: 'group_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        columnNames: ['group_id'],
        referencedTableName: 'groups',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_tenant_group_created',
        columnNames: ['tenant_id', 'group_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'audit_logs',
      'IDX_audit_logs_tenant_group_created',
    );
    await queryRunner.dropColumn('audit_logs', 'group_id');

    for (const table of [...groupScopedTables].reverse()) {
      await queryRunner.dropIndex(table, `IDX_${table}_tenant_group`);
      await queryRunner.dropColumn(table, 'group_id');
    }
  }
}
