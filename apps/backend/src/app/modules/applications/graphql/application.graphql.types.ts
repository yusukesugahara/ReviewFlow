import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { RelayNodeGql } from '../../../../common/graphql/relay-node';
import { PageInfoGql } from '../../../../common/graphql/relay-pagination';
import type { ApplicationStatusValue } from '../../../../models/constants/application-status';

@ObjectType('ApplicationProgressUser')
export class ApplicationProgressUserGql {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;
}

@ObjectType('ApplicationProgressAction')
export class ApplicationProgressActionGql {
  @Field(() => ID)
  id!: string;

  @Field()
  action!: string;

  @Field(() => String, { nullable: true })
  comment!: string | null;

  @Field()
  actedAt!: string;

  @Field(() => ApplicationProgressUserGql)
  actedBy!: ApplicationProgressUserGql;
}

@ObjectType('ApplicationProgressStep')
export class ApplicationProgressStepGql {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  stepOrder!: number;

  @Field()
  stepName!: string;

  @Field()
  canReturn!: boolean;

  @Field(() => String)
  status!: 'pending' | 'current' | 'approved' | 'returned' | 'rejected';

  @Field(() => [ApplicationProgressUserGql])
  assignees!: ApplicationProgressUserGql[];

  @Field(() => [ApplicationProgressActionGql])
  actions!: ApplicationProgressActionGql[];
}

@ObjectType('ApplicationSummary')
export class ApplicationSummaryGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  databaseId!: string;

  @Field(() => ID)
  groupId!: string;

  @Field(() => String)
  status!: ApplicationStatusValue;

  @Field(() => ID)
  approvalFlowId!: string;

  @Field(() => ID)
  formDefinitionId!: string;

  @Field()
  formDefinitionName!: string;

  @Field()
  applicationName!: string;

  @Field()
  applicantEmail!: string;

  @Field(() => ID, { nullable: true })
  applicantUserId!: string | null;

  @Field(() => Int, { nullable: true })
  currentStepOrder!: number | null;

  @Field(() => [ID])
  currentStepAssigneeUserIds!: string[];

  @Field(() => String, { nullable: true })
  submittedAt!: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('ApplicationCapabilities')
export class ApplicationCapabilitiesGql {
  @Field()
  canEditApplication!: boolean;

  @Field()
  canSubmitApplication!: boolean;

  @Field()
  canResubmitApplication!: boolean;

  @Field()
  canApproveApplication!: boolean;

  @Field()
  canRejectApplication!: boolean;

  @Field()
  canReturnApplication!: boolean;
}

@ObjectType('ApplicationDetail', { implements: () => [RelayNodeGql] })
export class ApplicationDetailGql extends ApplicationSummaryGql {
  @Field(() => ApplicationCapabilitiesGql)
  capabilities!: ApplicationCapabilitiesGql;

  @Field(() => Boolean, { nullable: true })
  currentStepCanReturn!: boolean | null;

  @Field(() => [ApplicationProgressStepGql])
  approvalProgress!: ApplicationProgressStepGql[];

  @Field(() => GraphQLJSON)
  values!: Record<string, unknown>;
}

@ObjectType('ApplicationSummaryEdge')
export class ApplicationSummaryEdgeGql {
  @Field(() => String)
  cursor!: string;

  @Field(() => ApplicationSummaryGql)
  node!: ApplicationSummaryGql;
}

@ObjectType('ApplicationSummaryConnection')
export class ApplicationSummaryConnectionGql {
  @Field(() => [ApplicationSummaryEdgeGql])
  edges!: ApplicationSummaryEdgeGql[];

  @Field(() => [ApplicationSummaryGql])
  nodes!: ApplicationSummaryGql[];

  @Field(() => PageInfoGql)
  pageInfo!: PageInfoGql;

  @Field(() => Int)
  totalCount!: number;
}

@ObjectType('ApplicationCorrectionItem')
export class ApplicationCorrectionItemGql {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  formFieldId!: string;

  @Field()
  fieldKey!: string;

  @Field(() => String, { nullable: true })
  comment!: string | null;

  @Field()
  isResolved!: boolean;

  @Field()
  createdAt!: string;
}

@ObjectType('ApplicationCorrection')
export class ApplicationCorrectionGql {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  overallComment!: string | null;

  @Field(() => String, { nullable: true })
  resolvedAt!: string | null;

  @Field()
  createdAt!: string;

  @Field(() => [ApplicationCorrectionItemGql])
  items!: ApplicationCorrectionItemGql[];
}

@ObjectType('ApplicationCorrectionTargetItem')
export class ApplicationCorrectionTargetItemGql {
  @Field(() => ID)
  itemId!: string;

  @Field(() => ID)
  formFieldId!: string;

  @Field()
  fieldKey!: string;

  @Field()
  label!: string;

  @Field()
  fieldType!: string;

  @Field()
  required!: boolean;

  @Field(() => String, { nullable: true })
  comment!: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  currentValue!: unknown;
}

@ObjectType('ApplicationOpenCorrectionTargets')
export class ApplicationOpenCorrectionTargetsGql {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  overallComment!: string | null;

  @Field()
  createdAt!: string;

  @Field(() => [ApplicationCorrectionTargetItemGql])
  items!: ApplicationCorrectionTargetItemGql[];
}

@ObjectType('ApplicationCorrectionTargets')
export class ApplicationCorrectionTargetsGql {
  @Field(() => ID)
  applicationId!: string;

  @Field(() => String)
  applicationStatus!: string;

  @Field(() => ApplicationOpenCorrectionTargetsGql, { nullable: true })
  openCorrection!: ApplicationOpenCorrectionTargetsGql | null;
}
