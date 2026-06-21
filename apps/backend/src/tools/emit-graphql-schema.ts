/**
 * Relay compiler 用の GraphQL schema を DB 接続なしで再生成する。
 *
 * Run from the backend workspace:
 * `npm run graphql:schema -w backend`
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { RelayNodeResolver } from '../app/graphql/relay-node.resolver';
import { ApplicationsGraphqlResolver } from '../app/modules/applications/graphql/applications.graphql.resolver';
import { ApprovalFlowsBusinessGraphqlResolver } from '../app/modules/approval-flows/graphql/approval-flows-business.graphql.resolver';
import { ApprovalFlowsRelayGraphqlResolver } from '../app/modules/approval-flows/graphql/approval-flows-relay.graphql.resolver';
import { AuditLogsBusinessGraphqlResolver } from '../app/modules/audit-logs/graphql/audit-logs-business.graphql.resolver';
import { AuditLogsRelayGraphqlResolver } from '../app/modules/audit-logs/graphql/audit-logs-relay.graphql.resolver';
import { AuthBusinessGraphqlResolver } from '../app/modules/auth/graphql/auth-business.graphql.resolver';
import { ExportJobsBusinessGraphqlResolver } from '../app/modules/export-jobs/graphql/export-jobs-business.graphql.resolver';
import { ExportJobsRelayGraphqlResolver } from '../app/modules/export-jobs/graphql/export-jobs-relay.graphql.resolver';
import { FormDefinitionsBusinessGraphqlResolver } from '../app/modules/form-definitions/graphql/form-definitions-business.graphql.resolver';
import { FormDefinitionsRelayGraphqlResolver } from '../app/modules/form-definitions/graphql/form-definitions-relay.graphql.resolver';
import { GroupsBusinessGraphqlResolver } from '../app/modules/groups/graphql/groups-business.graphql.resolver';
import { GroupsRelayGraphqlResolver } from '../app/modules/groups/graphql/groups-relay.graphql.resolver';
import { InvitationsBusinessGraphqlResolver } from '../app/modules/invitations/graphql/invitations-business.graphql.resolver';
import { UsersBusinessGraphqlResolver } from '../app/modules/users/graphql/users-business.graphql.resolver';
import { UsersRelayGraphqlResolver } from '../app/modules/users/graphql/users-relay.graphql.resolver';

const resolvers = [
  RelayNodeResolver,
  ApplicationsGraphqlResolver,
  ApprovalFlowsBusinessGraphqlResolver,
  ApprovalFlowsRelayGraphqlResolver,
  AuditLogsBusinessGraphqlResolver,
  AuditLogsRelayGraphqlResolver,
  AuthBusinessGraphqlResolver,
  ExportJobsBusinessGraphqlResolver,
  ExportJobsRelayGraphqlResolver,
  FormDefinitionsBusinessGraphqlResolver,
  FormDefinitionsRelayGraphqlResolver,
  GroupsBusinessGraphqlResolver,
  GroupsRelayGraphqlResolver,
  InvitationsBusinessGraphqlResolver,
  UsersBusinessGraphqlResolver,
  UsersRelayGraphqlResolver,
] as const;

async function emit(): Promise<void> {
  const app = await NestFactory.create(GraphQLSchemaBuilderModule, {
    logger: false,
  });
  try {
    await app.init();
    const schemaFactory = app.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([...resolvers]);
    const out = join(process.cwd(), 'schema.graphql');
    writeFileSync(
      out,
      `${printSchema(lexicographicSortSchema(schema))}\n`,
      'utf8',
    );
  } finally {
    await app.close();
  }
}

void emit().catch((err: unknown) => {
  console.error('graphql schema emit failed:', err);
  process.exit(1);
});
