import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { RelayNodeGql } from '../../../../common/graphql/relay-node';
import { PageInfoGql } from '../../../../common/graphql/relay-pagination';

@ObjectType('ApprovalStep')
export class ApprovalStepGql {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  stepOrder!: number;

  @Field()
  stepName!: string;

  @Field(() => ID)
  assigneeUserId!: string;

  @Field(() => [ID])
  assigneeUserIds!: string[];

  @Field()
  canReturn!: boolean;

  @Field()
  createdAt!: string;
}

@ObjectType('ApprovalFlow', { implements: () => [RelayNodeGql] })
export class ApprovalFlowGql implements RelayNodeGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  databaseId!: string;

  @Field(() => ID)
  groupId!: string;

  @Field()
  name!: string;

  @Field()
  isActive!: boolean;

  @Field(() => [ApprovalStepGql])
  steps!: ApprovalStepGql[];

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('ApprovalFlowEdge')
export class ApprovalFlowEdgeGql {
  @Field(() => String)
  cursor!: string;

  @Field(() => ApprovalFlowGql)
  node!: ApprovalFlowGql;
}

@ObjectType('ApprovalFlowConnection')
export class ApprovalFlowConnectionGql {
  @Field(() => [ApprovalFlowEdgeGql])
  edges!: ApprovalFlowEdgeGql[];

  @Field(() => [ApprovalFlowGql])
  nodes!: ApprovalFlowGql[];

  @Field(() => PageInfoGql)
  pageInfo!: PageInfoGql;

  @Field(() => Int)
  totalCount!: number;
}
