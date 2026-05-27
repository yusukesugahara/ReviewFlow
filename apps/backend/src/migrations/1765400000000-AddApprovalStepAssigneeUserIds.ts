import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddApprovalStepAssigneeUserIds1765400000000 implements MigrationInterface {
  name = 'AddApprovalStepAssigneeUserIds1765400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('approval_steps');
    if (!table?.findColumnByName('assignee_user_ids')) {
      await queryRunner.addColumn(
        'approval_steps',
        new TableColumn({
          name: 'assignee_user_ids',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('approval_steps');
    if (table?.findColumnByName('assignee_user_ids')) {
      await queryRunner.dropColumn('approval_steps', 'assignee_user_ids');
    }
  }
}
