import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAuditLogs1748800000000 implements MigrationInterface {
  name = 'CreateAuditLogs1748800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('audit_logs')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          {
            name: 'tenant_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'actor_user_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'action_type',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'target_type',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'target_id',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          { name: 'metadata_json', type: 'json', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['actor_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_audit_logs_tenant_created',
            columnNames: ['tenant_id', 'created_at'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs', true);
  }
}
