import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateApplicationApprovalsAndCorrections1748600000000
  implements MigrationInterface
{
  name = 'CreateApplicationApprovalsAndCorrections1748600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('application_approvals'))) {
      await queryRunner.createTable(
        new Table({
          name: 'application_approvals',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            { name: 'tenant_id', type: 'varchar', length: '36', isNullable: false },
            {
              name: 'application_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'approval_step_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'acted_by_user_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'action',
              type: 'varchar',
              length: '32',
              isNullable: false,
            },
            {
              name: 'comment',
              type: 'varchar',
              length: '4000',
              isNullable: true,
            },
            {
              name: 'acted_at',
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
              columnNames: ['application_id'],
              referencedTableName: 'applications',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
            new TableForeignKey({
              columnNames: ['approval_step_id'],
              referencedTableName: 'approval_steps',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
            new TableForeignKey({
              columnNames: ['acted_by_user_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
          ],
          indices: [
            new TableIndex({
              name: 'IDX_application_approvals_app',
              columnNames: ['application_id'],
            }),
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('correction_requests'))) {
      await queryRunner.createTable(
        new Table({
          name: 'correction_requests',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            { name: 'tenant_id', type: 'varchar', length: '36', isNullable: false },
            {
              name: 'application_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'requested_by_user_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '32',
              isNullable: false,
              default: `'open'`,
            },
            {
              name: 'overall_comment',
              type: 'varchar',
              length: '4000',
              isNullable: true,
            },
            {
              name: 'resolved_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
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
              columnNames: ['application_id'],
              referencedTableName: 'applications',
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
              name: 'IDX_correction_requests_app',
              columnNames: ['application_id'],
            }),
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('correction_request_items'))) {
      await queryRunner.createTable(
        new Table({
          name: 'correction_request_items',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            { name: 'tenant_id', type: 'varchar', length: '36', isNullable: false },
            {
              name: 'correction_request_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'form_field_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'comment',
              type: 'varchar',
              length: '4000',
              isNullable: true,
            },
            {
              name: 'is_resolved',
              type: 'boolean',
              isNullable: false,
              default: false,
            },
            {
              name: 'created_at',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
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
              columnNames: ['correction_request_id'],
              referencedTableName: 'correction_requests',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
            new TableForeignKey({
              columnNames: ['form_field_id'],
              referencedTableName: 'form_fields',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
          ],
          indices: [
            new TableIndex({
              name: 'IDX_correction_request_items_request',
              columnNames: ['correction_request_id'],
            }),
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('correction_request_items', true);
    await queryRunner.dropTable('correction_requests', true);
    await queryRunner.dropTable('application_approvals', true);
  }
}
