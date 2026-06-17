import { MigrationInterface, QueryRunner } from 'typeorm';

type GroupScopeForeignKey = {
  tableName: string;
  constraintName: string;
  onDelete: 'CASCADE' | 'RESTRICT' | 'SET_NULL_GROUP_ID';
};

const groupScopeForeignKeys: GroupScopeForeignKey[] = [
  {
    tableName: 'group_members',
    constraintName: 'FK_group_members_tenant_group',
    onDelete: 'CASCADE',
  },
  {
    tableName: 'form_definitions',
    constraintName: 'FK_form_definitions_tenant_group',
    onDelete: 'RESTRICT',
  },
  {
    tableName: 'approval_flows',
    constraintName: 'FK_approval_flows_tenant_group',
    onDelete: 'RESTRICT',
  },
  {
    tableName: 'approval_steps',
    constraintName: 'FK_approval_steps_tenant_group',
    onDelete: 'RESTRICT',
  },
  {
    tableName: 'applications',
    constraintName: 'FK_applications_tenant_group',
    onDelete: 'RESTRICT',
  },
  {
    tableName: 'export_jobs',
    constraintName: 'FK_export_jobs_tenant_group',
    onDelete: 'RESTRICT',
  },
  {
    tableName: 'invitations',
    constraintName: 'FK_invitations_tenant_group',
    onDelete: 'SET_NULL_GROUP_ID',
  },
  {
    tableName: 'audit_logs',
    constraintName: 'FK_audit_logs_tenant_group',
    onDelete: 'SET_NULL_GROUP_ID',
  },
];

const groupsTenantIdIdIndexName = 'UQ_groups_tenant_id_id';

export class EnforceTenantGroupCompositeScope1781500000000 implements MigrationInterface {
  name = 'EnforceTenantGroupCompositeScope1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "${groupsTenantIdIdIndexName}"
      ON "groups" ("tenant_id", "id")
    `);

    for (const foreignKey of groupScopeForeignKeys) {
      await addTenantGroupForeignKey(queryRunner, foreignKey);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const foreignKey of [...groupScopeForeignKeys].reverse()) {
      await dropConstraintIfExists(
        queryRunner,
        foreignKey.tableName,
        foreignKey.constraintName,
      );
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "${groupsTenantIdIdIndexName}"`,
    );
  }
}

async function addTenantGroupForeignKey(
  queryRunner: QueryRunner,
  foreignKey: GroupScopeForeignKey,
): Promise<void> {
  if (!(await hasTenantGroupColumns(queryRunner, foreignKey.tableName))) {
    return;
  }
  if (await constraintExists(queryRunner, foreignKey.constraintName)) {
    return;
  }

  await assertNoTenantGroupMismatches(queryRunner, foreignKey.tableName);

  await queryRunner.query(`
    ALTER TABLE "${foreignKey.tableName}"
    ADD CONSTRAINT "${foreignKey.constraintName}"
    FOREIGN KEY ("tenant_id", "group_id")
    REFERENCES "groups" ("tenant_id", "id")
    ${onDeleteClause(foreignKey.onDelete)}
  `);
}

async function hasTenantGroupColumns(
  queryRunner: QueryRunner,
  tableName: string,
): Promise<boolean> {
  const table = await queryRunner.getTable(tableName);
  return Boolean(
    table?.findColumnByName('tenant_id') && table.findColumnByName('group_id'),
  );
}

async function assertNoTenantGroupMismatches(
  queryRunner: QueryRunner,
  tableName: string,
): Promise<void> {
  const rows = (await queryRunner.query(
    `
      SELECT COUNT(*) AS count
      FROM "${tableName}" scoped
      LEFT JOIN "groups" g
        ON g."id" = scoped."group_id"
       AND g."tenant_id" = scoped."tenant_id"
      WHERE scoped."group_id" IS NOT NULL
        AND g."id" IS NULL
    `,
  )) as { count: string }[];
  const count = Number(rows[0]?.count ?? 0);
  if (count > 0) {
    throw new Error(
      `Cannot add tenant/group composite foreign key to ${tableName}: ` +
        `${count} row(s) reference a group outside their tenant scope.`,
    );
  }
}

async function constraintExists(
  queryRunner: QueryRunner,
  constraintName: string,
): Promise<boolean> {
  const rows = (await queryRunner.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = $1
      ) AS "exists"
    `,
    [constraintName],
  )) as { exists: boolean }[];
  return rows[0]?.exists === true;
}

async function dropConstraintIfExists(
  queryRunner: QueryRunner,
  tableName: string,
  constraintName: string,
): Promise<void> {
  if (!(await queryRunner.hasTable(tableName))) {
    return;
  }

  await queryRunner.query(
    `ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${constraintName}"`,
  );
}

function onDeleteClause(onDelete: GroupScopeForeignKey['onDelete']): string {
  if (onDelete === 'SET_NULL_GROUP_ID') {
    return 'ON DELETE SET NULL ("group_id")';
  }
  return `ON DELETE ${onDelete}`;
}
