import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateApplicationsAndFieldValues1748500000000 implements MigrationInterface {
  name = 'CreateApplicationsAndFieldValues1748500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('applications'))) {
      await queryRunner.createTable(
        new Table({
          name: 'applications',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            {
              name: 'tenant_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'applicant_user_id',
              type: 'varchar',
              length: '36',
              isNullable: true,
            },
            {
              name: 'form_definition_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'approval_flow_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'current_step_order',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'varchar',
              length: '32',
              isNullable: false,
              default: `'draft'`,
            },
            {
              name: 'submitted_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
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
              columnNames: ['applicant_user_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
            new TableForeignKey({
              columnNames: ['form_definition_id'],
              referencedTableName: 'form_definitions',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
            new TableForeignKey({
              columnNames: ['approval_flow_id'],
              referencedTableName: 'approval_flows',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
          ],
          indices: [
            new TableIndex({
              name: 'IDX_applications_tenant_status_created',
              columnNames: ['tenant_id', 'status', 'created_at'],
            }),
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('application_field_values'))) {
      await queryRunner.createTable(
        new Table({
          name: 'application_field_values',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            {
              name: 'tenant_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'application_id',
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
            { name: 'value_json', type: 'json', isNullable: false },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
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
              columnNames: ['application_id'],
              referencedTableName: 'applications',
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
              name: 'UQ_app_field_values_app_field',
              columnNames: ['application_id', 'form_field_id'],
              isUnique: true,
            }),
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('application_field_values', true);
    await queryRunner.dropTable('applications', true);
  }
}
