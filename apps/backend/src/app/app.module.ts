import { ExecutionContext, Module } from '@nestjs/common';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { HealthModule } from './modules/health/health.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ApprovalFlowsModule } from './modules/approval-flows/approval-flows.module';
import { ExportJobsModule } from './modules/export-jobs/export-jobs.module';
import { FormDefinitionsModule } from './modules/form-definitions/form-definitions.module';
import { GroupsModule } from './modules/groups/groups.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { UsersModule } from './modules/users/users.module';
import { buildTypeOrmOptions } from './typeorm-options.factory';
import { MailModule } from './modules/mail/mail.module';
import { validateEnv } from './config/validate-env';
import { AppThrottlerGuard } from './guards/app-throttler.guard';
import { RelayNodeResolver } from './graphql/relay-node.resolver';

type GraphqlContextFactoryParams = {
  req: Request;
  res: Response;
};

const configModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath:
    process.env.NODE_ENV === 'production' ? ['.env'] : ['.env', '.env.dev'],
  validate: validateEnv,
});

const dbModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
  inject: [ConfigService],
});

const loggerModule = LoggerModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    pinoHttp: {
      level: config.get<string>('LOG_LEVEL') ?? 'info',
      autoLogging: false,
      redact: {
        censor: '＊＊＊＊＊＊＊＊',
        paths: [
          'req.headers.authorization',
          'req.headers.x-api-key',
          'req.headers.cookie',
          'req.body.password',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.confirmPassword',
          'body.password',
          'body.currentPassword',
          'body.newPassword',
          'body.confirmPassword',
        ],
      },
    },
  }),
  inject: [ConfigService],
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

const graphqlModule = GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  imports: [ConfigModule],
  useFactory: (config: ConfigService): ApolloDriverConfig => {
    const isProd = config.get<string>('NODE_ENV') === 'production';
    return {
      driver: ApolloDriver,
      path: '/graphql',
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      graphiql: !isProd,
      context: ({ req, res }: GraphqlContextFactoryParams) => ({
        req,
        res,
      }),
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
    graphqlModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AuditLogsModule,
    MailModule,
    InvitationsModule,
    FormDefinitionsModule,
    GroupsModule,
    ApprovalFlowsModule,
    ApplicationsModule,
    ExportJobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    RelayNodeResolver,
  ],
})
export class AppModule {}
