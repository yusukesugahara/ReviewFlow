import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AllowMultipleFormDefinitionsPerGroup1765500000000 implements MigrationInterface {
  name = 'AllowMultipleFormDefinitionsPerGroup1765500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('form_definitions');
    if (!table) {
      return;
    }

    for (const indexName of [
      'UQ_form_definitions_tenant_group',
      'IDX_form_definitions_tenant_group',
    ]) {
      if (table.indices.some((index) => index.name === indexName)) {
        await queryRunner.dropIndex('form_definitions', indexName);
      }
    }

    await queryRunner.createIndex(
      'form_definitions',
      new TableIndex({
        name: 'IDX_form_definitions_tenant_group',
        columnNames: ['tenant_id', 'group_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('form_definitions');
    if (!table) {
      return;
    }

    if (
      table.indices.some(
        (index) => index.name === 'IDX_form_definitions_tenant_group',
      )
    ) {
      await queryRunner.dropIndex(
        'form_definitions',
        'IDX_form_definitions_tenant_group',
      );
    }

    await queryRunner.createIndex(
      'form_definitions',
      new TableIndex({
        name: 'IDX_form_definitions_tenant_group',
        columnNames: ['tenant_id', 'group_id'],
        isUnique: true,
      }),
    );
  }
}
