import { ExecutionContext, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogInterceptor } from '../common/logging/audit-log.interceptor';
import { buildTypeOrmOptions } from './typeorm-options.factory';

/*
 * データベースモジュール（`DB_DRIVER`: 省略時 sqlite / `mysql` で MySQL）
 */
const dbModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
  inject: [ConfigService],
});

const loggerModule = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    autoLogging: false,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.x-api-key',
        'req.headers.cookie',
      ],
    },
  },
});

const configModule = ConfigModule.forRoot({
  isGlobal: true,
  // 本番は `.env` のみ。それ以外は `.env` のあと `.env.dev` で上書き（ローカル開発用）
  envFilePath:
    process.env.NODE_ENV === 'production' ? ['.env'] : ['.env', '.env.dev'],
});

const throttlerModule = ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => {
    const ttl = Number(config.get<string>('THROTTLE_TTL_MS') ?? 60_000);
    const nodeEnv = config.get<string>('NODE_ENV');
    const limit =
      nodeEnv === 'production'
        ? Number(config.get<string>('THROTTLE_LIMIT') ?? 120)
        : Number(config.get<string>('THROTTLE_LIMIT_DEV') ?? 2000);
    return {
      skipIf: (context: ExecutionContext) => {
        if (config.get<string>('NODE_ENV') === 'test') {
          return true;
        }
        const req = context.switchToHttp().getRequest<{ method?: string }>();
        return req?.method === 'OPTIONS';
      },
      throttlers: [{ name: 'default', ttl, limit }],
    };
  },
  inject: [ConfigService],
});

@Module({
  imports: [
    configModule,
    loggerModule,
    dbModule,
    throttlerModule,
    HealthModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    AuditLogInterceptor,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
