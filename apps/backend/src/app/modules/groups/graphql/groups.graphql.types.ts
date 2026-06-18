import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { RelayNodeGql } from '../../../../common/graphql/relay-node';
import { PageInfoGql } from '../../../../common/graphql/relay-pagination';

@ObjectType('Group', { implements: () => [RelayNodeGql] })
export class GroupGql implements RelayNodeGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  databaseId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID)
  createdByUserId!: string;

  @Field(() => String, { nullable: true })
  currentUserRole!: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('GroupEdge')
export class GroupEdgeGql {
  @Field(() => String)
  cursor!: string;

  @Field(() => GroupGql)
  node!: GroupGql;
}

@ObjectType('GroupConnection')
export class GroupConnectionGql {
  @Field(() => [GroupEdgeGql])
  edges!: GroupEdgeGql[];

  @Field(() => [GroupGql])
  nodes!: GroupGql[];

  @Field(() => PageInfoGql)
  pageInfo!: PageInfoGql;

  @Field(() => Int)
  totalCount!: number;
}
