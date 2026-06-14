import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEmailChangeTokens1765700000000 implements MigrationInterface {
  name = 'CreateEmailChangeTokens1765700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('email_change_tokens')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'email_change_tokens',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          {
            name: 'tenant_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'current_email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'new_email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          { name: 'expires_at', type: 'timestamp', isNullable: false },
          { name: 'used_at', type: 'timestamp', isNullable: true },
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
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_email_change_tokens_token',
            columnNames: ['token'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_email_change_tokens_new_email',
            columnNames: ['new_email'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_change_tokens', true);
  }
}
