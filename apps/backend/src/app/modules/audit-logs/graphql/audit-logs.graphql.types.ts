import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { RelayNodeGql } from '../../../../common/graphql/relay-node';
import { PageInfoGql } from '../../../../common/graphql/relay-pagination';
import type {
  AuditEventActorDto,
  AuditEventChangeDto,
  AuditEventResourceDto,
} from '../dto/audit-logs.dto';

@InputType('AuditLogsFilterInput')
export class AuditLogsFilterInputGql {
  @Field(() => String, { nullable: true })
  actionType?: string;

  @Field(() => String, { nullable: true })
  targetType?: string;

  @Field(() => ID, { nullable: true })
  applicationId?: string;

  @Field(() => ID, { nullable: true })
  groupId?: string;

  @Field(() => ID, { nullable: true })
  targetUserId?: string;

  @Field(() => String, { nullable: true })
  q?: string;

  @Field(() => String, { nullable: true })
  createdFrom?: string;

  @Field(() => String, { nullable: true })
  createdTo?: string;
}

@ObjectType('AuditLog', { implements: () => [RelayNodeGql] })
export class AuditLogGql implements RelayNodeGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  databaseId!: string;

  @Field(() => ID, { nullable: true })
  groupId!: string | null;

  @Field(() => ID, { nullable: true })
  actorUserId!: string | null;

  @Field(() => String, { nullable: true })
  actorEmail!: string | null;

  @Field()
  actorType!: string;

  @Field(() => String, { nullable: true })
  actorEmailSnapshot!: string | null;

  @Field()
  actionType!: string;

  @Field()
  targetType!: string;

  @Field(() => String, { nullable: true })
  targetId!: string | null;

  @Field(() => String, { nullable: true })
  scopeType!: string | null;

  @Field(() => String, { nullable: true })
  scopeId!: string | null;

  @Field(() => String, { nullable: true })
  resourceType!: string | null;

  @Field(() => String, { nullable: true })
  resourceId!: string | null;

  @Field(() => String, { nullable: true })
  resourceLabel!: string | null;

  @Field(() => String, { nullable: true })
  operation!: string | null;

  @Field()
  outcome!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  actor!: AuditEventActorDto | null;

  @Field(() => GraphQLJSON, { nullable: true })
  resource!: AuditEventResourceDto | null;

  @Field(() => GraphQLJSON, { nullable: true })
  changes!: AuditEventChangeDto[] | null;

  @Field(() => ID, { nullable: true })
  targetUserId!: string | null;

  @Field(() => String, { nullable: true })
  targetEmailSnapshot!: string | null;

  @Field(() => ID, { nullable: true })
  applicationId!: string | null;

  @Field(() => String, { nullable: true })
  statusFrom!: string | null;

  @Field(() => String, { nullable: true })
  statusTo!: string | null;

  @Field(() => Int, { nullable: true })
  stepOrderFrom!: number | null;

  @Field(() => Int, { nullable: true })
  stepOrderTo!: number | null;

  @Field(() => String, { nullable: true })
  roleFrom!: string | null;

  @Field(() => String, { nullable: true })
  roleTo!: string | null;

  @Field(() => String, { nullable: true })
  groupRoleFrom!: string | null;

  @Field(() => String, { nullable: true })
  groupRoleTo!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @Field()
  createdAt!: string;
}

@ObjectType('AuditLogEdge')
export class AuditLogEdgeGql {
  @Field(() => String)
  cursor!: string;

  @Field(() => AuditLogGql)
  node!: AuditLogGql;
}

@ObjectType('AuditLogConnection')
export class AuditLogConnectionGql {
  @Field(() => [AuditLogEdgeGql])
  edges!: AuditLogEdgeGql[];

  @Field(() => [AuditLogGql])
  nodes!: AuditLogGql[];

  @Field(() => PageInfoGql)
  pageInfo!: PageInfoGql;

  @Field(() => Int)
  totalCount!: number;
}
