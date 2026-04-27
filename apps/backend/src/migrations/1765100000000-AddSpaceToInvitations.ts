import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddSpaceToInvitations1765100000000 implements MigrationInterface {
  name = 'AddSpaceToInvitations1765100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('invitations');
    if (!table) {
      return;
    }

    if (!table.findColumnByName('group_id')) {
      await queryRunner.addColumn(
        'invitations',
        new TableColumn({
          name: 'group_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('group_role')) {
      await queryRunner.addColumn(
        'invitations',
        new TableColumn({
          name: 'group_role',
          type: 'varchar',
          length: '32',
          isNullable: true,
        }),
      );
    }

    const updatedTable = await queryRunner.getTable('invitations');
    const hasGroupFk = updatedTable?.foreignKeys.some(
      (fk) => fk.columnNames.length === 1 && fk.columnNames[0] === 'group_id',
    );
    if (!hasGroupFk) {
      await queryRunner.createForeignKey(
        'invitations',
        new TableForeignKey({
          columnNames: ['group_id'],
          referencedTableName: 'groups',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('invitations');
    const groupFk = table?.foreignKeys.find(
      (fk) => fk.columnNames.length === 1 && fk.columnNames[0] === 'group_id',
    );
    if (groupFk) {
      await queryRunner.dropForeignKey('invitations', groupFk);
    }

    if (table?.findColumnByName('group_role')) {
      await queryRunner.dropColumn('invitations', 'group_role');
    }
    if (table?.findColumnByName('group_id')) {
      await queryRunner.dropColumn('invitations', 'group_id');
    }
  }
}
