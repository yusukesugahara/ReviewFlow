import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateFormDefinitionsAndFields1748300000000 implements MigrationInterface {
  name = 'CreateFormDefinitionsAndFields1748300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('form_definitions'))) {
      await queryRunner.createTable(
        new Table({
          name: 'form_definitions',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            {
              name: 'tenant_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            { name: 'name', type: 'varchar', length: '255', isNullable: false },
            {
              name: 'description',
              type: 'varchar',
              length: '2000',
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
              name: 'created_by_user_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
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
              columnNames: ['created_by_user_id'],
              referencedTableName: 'users',
              referencedColumnNames: ['id'],
              onDelete: 'RESTRICT',
            }),
          ],
          indices: [
            new TableIndex({
              name: 'IDX_form_definitions_tenant',
              columnNames: ['tenant_id'],
            }),
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('form_fields'))) {
      await queryRunner.createTable(
        new Table({
          name: 'form_fields',
          columns: [
            { name: 'id', type: 'varchar', length: '36', isPrimary: true },
            {
              name: 'tenant_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'form_definition_id',
              type: 'varchar',
              length: '36',
              isNullable: false,
            },
            {
              name: 'field_key',
              type: 'varchar',
              length: '128',
              isNullable: false,
            },
            {
              name: 'label',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'field_type',
              type: 'varchar',
              length: '32',
              isNullable: false,
            },
            {
              name: 'required',
              type: 'boolean',
              isNullable: false,
              default: false,
            },
            {
              name: 'placeholder',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'help_text',
              type: 'varchar',
              length: '2000',
              isNullable: true,
            },
            { name: 'options_json', type: 'json', isNullable: true },
            { name: 'sort_order', type: 'int', isNullable: false },
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
              columnNames: ['form_definition_id'],
              referencedTableName: 'form_definitions',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
            }),
          ],
          indices: [
            new TableIndex({
              name: 'IDX_form_fields_tenant_definition',
              columnNames: ['tenant_id', 'form_definition_id'],
            }),
            new TableIndex({
              name: 'UQ_form_fields_definition_key',
              columnNames: ['form_definition_id', 'field_key'],
              isUnique: true,
            }),
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('form_fields', true);
    await queryRunner.dropTable('form_definitions', true);
  }
}
