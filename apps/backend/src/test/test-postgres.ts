import { DataSource } from 'typeorm';

export function configurePostgresTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.MAIL_ENABLED = '0';
  process.env.MAIL_FROM ??= 'noreply@example.com';
  process.env.FRONTEND_BASE_URL ??= 'http://localhost:3001';

  if (process.env.TEST_DATABASE_URL?.length) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    return;
  }

  delete process.env.DATABASE_URL;
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = '5432';
  process.env.DB_USERNAME = 'app';
  process.env.DB_PASSWORD = 'app';
  process.env.DB_NAME = 'app_test';
}

export async function preparePostgresTestDatabase(): Promise<void> {
  configurePostgresTestEnv();
  const databaseName = getTargetDatabaseName();
  assertSafeTestDatabaseName(databaseName);

  await ensurePostgresDatabaseExists(databaseName);
  await resetPublicSchema();
}

async function ensurePostgresDatabaseExists(
  databaseName: string,
): Promise<void> {
  const dataSource = new DataSource(buildAdminDataSourceOptions());
  try {
    await dataSource.initialize();
    const rows = await dataSource.query<{ exists: boolean }[]>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"',
      [databaseName],
    );

    if (rows[0]?.exists) {
      return;
    }

    await dataSource.query(
      `CREATE DATABASE "${escapeIdentifier(databaseName)}"`,
    );
  } catch (error) {
    if (!isDuplicateDatabaseError(error)) {
      throw error;
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function resetPublicSchema(): Promise<void> {
  const dataSource = new DataSource(buildTargetDataSourceOptions());
  try {
    await dataSource.initialize();
    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
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

function buildAdminDataSourceOptions(): ConstructorParameters<
  typeof DataSource
>[0] {
  if (process.env.DATABASE_URL?.length) {
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = '/postgres';
    return {
      type: 'postgres',
      url: url.toString(),
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  };
}

function buildTargetDataSourceOptions(): ConstructorParameters<
  typeof DataSource
>[0] {
  if (process.env.DATABASE_URL?.length) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

function getTargetDatabaseName(): string {
  if (process.env.DATABASE_URL?.length) {
    const url = new URL(process.env.DATABASE_URL);
    const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (databaseName.length > 0) {
      return databaseName;
    }
  }

  if (process.env.DB_NAME?.length) {
    return process.env.DB_NAME;
  }

  throw new Error('PostgreSQL test database name is not configured.');
}

function escapeIdentifier(value: string): string {
  return value.replaceAll('"', '""');
}

function assertSafeTestDatabaseName(databaseName: string): void {
  if (databaseName.toLowerCase().includes('test')) {
    return;
  }

  throw new Error(
    `Refusing to reset PostgreSQL database "${databaseName}". ` +
      'Set TEST_DATABASE_URL to a dedicated database name containing "test".',
  );
}

function isDuplicateDatabaseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '42P04'
  );
}
