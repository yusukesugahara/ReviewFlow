import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddArchivedFromStatusToFormDefinitions1765600000000 implements MigrationInterface {
  name = 'AddArchivedFromStatusToFormDefinitions1765600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('form_definitions');
    if (!table || table.findColumnByName('archived_from_status')) {
      return;
    }

    await queryRunner.addColumn(
      'form_definitions',
      new TableColumn({
        name: 'archived_from_status',
        type: 'varchar',
        length: '32',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('form_definitions');
    if (!table || !table.findColumnByName('archived_from_status')) {
      return;
    }

    await queryRunner.dropColumn('form_definitions', 'archived_from_status');
  }
}
