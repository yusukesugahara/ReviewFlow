import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../models/entities/user.entity';

export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const syncExplicitlyOff = config.get<string>('DB_SYNCHRONIZE') === 'false';
  const synchronize = !isProd && !syncExplicitlyOff;
  const migrationsRun = !synchronize;
  const migrations = [join(__dirname, '..', 'migrations', '*.{js,ts}')];
  const entities = [User];
  const sslEnabled = config.get<string>('DB_SSL') === 'true';
  const ssl = sslEnabled
    ? {
        rejectUnauthorized:
          config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
      }
    : undefined;
  const url = config.get<string>('DATABASE_URL');

  if (url?.length) {
    return {
      type: 'postgres',
      url,
      entities,
      synchronize,
      migrations,
      migrationsRun,
      ...(ssl !== undefined ? { ssl } : {}),
    };
  }

  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port: Number(config.get<string>('DB_PORT') ?? 5432),
    username: config.getOrThrow<string>('DB_USERNAME'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_NAME'),
    entities,
    synchronize,
    migrations,
    migrationsRun,
  };
}
