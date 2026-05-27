import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePasswordResetTokens1765300000000 implements MigrationInterface {
  name = 'CreatePasswordResetTokens1765300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('password_reset_tokens')) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
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
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          {
            name: 'token',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          { name: 'expires_at', type: 'datetime', isNullable: false },
          { name: 'used_at', type: 'datetime', isNullable: true },
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
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_password_reset_tokens_token',
            columnNames: ['token'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'IDX_password_reset_tokens_email',
            columnNames: ['email'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('password_reset_tokens', true);
  }
}
