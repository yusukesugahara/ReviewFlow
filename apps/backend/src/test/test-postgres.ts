import { DataSource } from 'typeorm';

export function configurePostgresTestEnv(): void {
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.MAIL_ENABLED = '0';
  process.env.MAIL_FROM ??= 'noreply@example.com';
  process.env.FRONTEND_BASE_URL ??= 'http://localhost:3001';

  if (process.env.TEST_DATABASE_URL?.length) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    return;
  }

  delete process.env.DATABASE_URL;
  process.env.DB_HOST ??= '127.0.0.1';
  process.env.DB_PORT ??= '5432';
  process.env.DB_USERNAME ??= 'app';
  process.env.DB_PASSWORD ??= 'app';
  process.env.DB_NAME ??= 'app';
}

export async function truncatePostgresTables(
  dataSource: DataSource,
): Promise<void> {
  const rows = await dataSource.query<{ tablename: string }[]>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  if (rows.length === 0) {
    return;
  }

  const tables = rows
    .map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`)
    .join(', ');

  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}
