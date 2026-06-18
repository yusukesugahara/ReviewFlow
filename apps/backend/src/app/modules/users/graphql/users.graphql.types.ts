import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { RelayNodeGql } from '../../../../common/graphql/relay-node';
import { PageInfoGql } from '../../../../common/graphql/relay-pagination';

@ObjectType('User', { implements: () => [RelayNodeGql] })
export class UserGql implements RelayNodeGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  databaseId!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field()
  role!: string;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: string;
}

@ObjectType('UserEdge')
export class UserEdgeGql {
  @Field(() => String)
  cursor!: string;

  @Field(() => UserGql)
  node!: UserGql;
}

@ObjectType('UserConnection')
export class UserConnectionGql {
  @Field(() => [UserEdgeGql])
  edges!: UserEdgeGql[];

  @Field(() => [UserGql])
  nodes!: UserGql[];

  @Field(() => PageInfoGql)
  pageInfo!: PageInfoGql;

  @Field(() => Int)
  totalCount!: number;
}
