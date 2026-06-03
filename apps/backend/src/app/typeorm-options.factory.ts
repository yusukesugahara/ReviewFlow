import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ApplicationApproval } from '../models/entities/application-approval.entity';
import { ApplicationFieldValue } from '../models/entities/application-field-value.entity';
import { Application } from '../models/entities/application.entity';
import { AuditLog } from '../models/entities/audit-log.entity';
import { CorrectionRequestItem } from '../models/entities/correction-request-item.entity';
import { CorrectionRequest } from '../models/entities/correction-request.entity';
import { ApprovalFlow } from '../models/entities/approval-flow.entity';
import { ApprovalStep } from '../models/entities/approval-step.entity';
import { ExportJob } from '../models/entities/export-job.entity';
import { FormField } from '../models/entities/form-field.entity';
import { FormDefinition } from '../models/entities/form-definition.entity';
import { GroupMember } from '../models/entities/group-member.entity';
import { Group } from '../models/entities/group.entity';
import { Invitation } from '../models/entities/invitation.entity';
import { PasswordResetToken } from '../models/entities/password-reset-token.entity';
import { Tenant } from '../models/entities/tenant.entity';
import { User } from '../models/entities/user.entity';

function isMysqlDriver(raw: string | undefined): boolean {
  const d = (raw ?? 'sqlite').toLowerCase();
  return d === 'mysql' || d === 'mariadb';
}

export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const syncExplicitlyOff = config.get<string>('DB_SYNCHRONIZE') === 'false';
  const synchronize = !isProd && !syncExplicitlyOff;
  const migrationsRun = !synchronize;
  const migrations = [join(__dirname, '..', 'migrations', '*.{js,ts}')];
  const entities = [
    Application,
    ApplicationApproval,
    ApplicationFieldValue,
    AuditLog,
    CorrectionRequest,
    CorrectionRequestItem,
    ExportJob,
    ApprovalFlow,
    ApprovalStep,
    FormField,
    FormDefinition,
    Group,
    GroupMember,
    Invitation,
    PasswordResetToken,
    Tenant,
    User,
  ];

  if (isMysqlDriver(config.get<string>('DB_DRIVER'))) {
    const url = config.get<string>('DATABASE_URL');
    const sslEnabled = config.get<string>('DB_SSL') === 'true';
    const ssl = sslEnabled
      ? {
          rejectUnauthorized:
            config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
        }
      : undefined;

    const dbType =
      (config.get<string>('DB_DRIVER') ?? 'mysql').toLowerCase() === 'mariadb'
        ? 'mariadb'
        : 'mysql';

    if (url?.length) {
      return {
        type: dbType,
        url,
        entities,
        synchronize,
        migrations,
        migrationsRun,
        ...(ssl !== undefined ? { ssl } : {}),
      };
    }

    return {
      type: dbType,
      host: config.getOrThrow<string>('DB_HOST'),
      port: Number(config.get<string>('DB_PORT') ?? 3306),
      username: config.getOrThrow<string>('DB_USERNAME'),
      password: config.getOrThrow<string>('DB_PASSWORD'),
      database: config.getOrThrow<string>('DB_NAME'),
      entities,
      synchronize,
      migrations,
      migrationsRun,
      ...(ssl !== undefined ? { ssl } : {}),
    };
  }

  const dbPath =
    config.get<string>('DB_PATH') ?? join(process.cwd(), 'var', 'sqlite.db');
  mkdirSync(dirname(dbPath), { recursive: true });

  return {
    type: 'better-sqlite3',
    database: dbPath,
    entities,
    synchronize,
    migrations,
    migrationsRun,
  };
}
