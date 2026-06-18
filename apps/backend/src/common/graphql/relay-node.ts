import { Field, ID, InterfaceType } from '@nestjs/graphql';

@InterfaceType('Node', {
  resolveType(value: RelayNodeGql) {
    return value.__typename ?? null;
  },
})
export abstract class RelayNodeGql {
  __typename?: string;

  @Field(() => ID)
  id!: string;
}
