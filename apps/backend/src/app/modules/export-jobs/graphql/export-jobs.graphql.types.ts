import { Field, ID, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { RelayNodeGql } from '../../../../common/graphql/relay-node';

@ObjectType('ExportJob', { implements: () => [RelayNodeGql] })
export class ExportJobGql implements RelayNodeGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  databaseId!: string;

  @Field(() => ID)
  groupId!: string;

  @Field()
  status!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  filterJson!: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  filePath!: string | null;

  @Field(() => String, { nullable: true })
  startedAt!: string | null;

  @Field(() => String, { nullable: true })
  finishedAt!: string | null;

  @Field()
  createdAt!: string;
}
