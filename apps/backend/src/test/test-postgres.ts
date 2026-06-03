import { DataSource } from 'typeorm';

export function configurePostgresTestEnv(): void {
  process.env.DB_SYNCHRONIZE = 'true';

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

export async function truncatePostgresTables(dataSource: DataSource): Promise<void> {
  await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
}
