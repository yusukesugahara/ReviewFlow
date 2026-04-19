import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateApprovalFlowsAndSteps1748400000000
  implements MigrationInterface
{
  name = 'CreateApprovalFlowsAndSteps1748400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('approval_flows'))) {
      await queryRunner.createTable(
        new Table({
          name: 'approval_flows',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            { name: 'tenant_id', type: 'varchar', length: '36', isNullable: false },
            {
              name: 'form_template_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            { name: 'name', type: 'varchar', length: '255', isNullable: false },
            {
              name: 'is_active',
              type: 'boolean',
              isNullable: false,
              default: true,
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
              columnNames: ['form_template_id'],
              referencedTableName: 'form_templates',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
          ],
          indices: [
            new TableIndex({
              name: 'IDX_approval_flows_tenant',
              columnNames: ['tenant_id'],
            }),
            new TableIndex({
              name: 'IDX_approval_flows_template',
              columnNames: ['form_template_id'],
            }),
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('approval_steps'))) {
      await queryRunner.createTable(
        new Table({
          name: 'approval_steps',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            { name: 'tenant_id', type: 'varchar', length: '36', isNullable: false },
            {
              name: 'approval_flow_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            { name: 'step_order', type: 'int', isNullable: false },
            { name: 'step_name', type: 'varchar', length: '255', isNullable: false },
            {
              name: 'approver_role',
              type: 'varchar',
              length: '32',
              isNullable: false,
            },
            {
              name: 'can_return',
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
              columnNames: ['approval_flow_id'],
              referencedTableName: 'approval_flows',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_approval_steps_flow_order',
              columnNames: ['approval_flow_id', 'step_order'],
              isUnique: true,
            }),
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('approval_steps', true);
    await queryRunner.dropTable('approval_flows', true);
  }
}
