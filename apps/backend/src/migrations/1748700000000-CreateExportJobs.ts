import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateExportJobs1748700000000 implements MigrationInterface {
  name = 'CreateExportJobs1748700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('export_jobs')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'export_jobs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'tenant_id', type: 'varchar', length: '36', isNullable: false },
          {
            name: 'requested_by_user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          { name: 'status', type: 'varchar', length: '32', isNullable: false },
          { name: 'filter_json', type: 'json', isNullable: true },
          { name: 'file_path', type: 'varchar', length: '1000', isNullable: true },
          { name: 'started_at', type: 'datetime', isNullable: true },
          { name: 'finished_at', type: 'datetime', isNullable: true },
          {
            name: 'created_at',
            type: 'datetime',
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
            columnNames: ['requested_by_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_export_jobs_tenant_status_created',
            columnNames: ['tenant_id', 'status', 'created_at'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('export_jobs', true);
  }
}
