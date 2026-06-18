import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { RelayNodeGql } from '../../../../common/graphql/relay-node';
import { PageInfoGql } from '../../../../common/graphql/relay-pagination';

@ObjectType('FormField')
export class FormFieldGql {
  @Field(() => ID)
  id!: string;

  @Field()
  fieldKey!: string;

  @Field()
  label!: string;

  @Field()
  fieldType!: string;

  @Field()
  required!: boolean;

  @Field(() => String, { nullable: true })
  placeholder!: string | null;

  @Field(() => String, { nullable: true })
  helpText!: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  options!: unknown[] | null;

  @Field(() => Int)
  sortOrder!: number;

  @Field()
  createdAt!: string;
}

@ObjectType('FormDefinition', { implements: () => [RelayNodeGql] })
export class FormDefinitionGql implements RelayNodeGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  databaseId!: string;

  @Field(() => ID)
  groupId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field()
  status!: string;

  @Field(() => ID)
  createdByUserId!: string;

  @Field(() => [FormFieldGql])
  fields!: FormFieldGql[];

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('FormDefinitionEdge')
export class FormDefinitionEdgeGql {
  @Field(() => String)
  cursor!: string;

  @Field(() => FormDefinitionGql)
  node!: FormDefinitionGql;
}

@ObjectType('FormDefinitionConnection')
export class FormDefinitionConnectionGql {
  @Field(() => [FormDefinitionEdgeGql])
  edges!: FormDefinitionEdgeGql[];

  @Field(() => [FormDefinitionGql])
  nodes!: FormDefinitionGql[];

  @Field(() => PageInfoGql)
  pageInfo!: PageInfoGql;

  @Field(() => Int)
  totalCount!: number;
}
