import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { connectionFromNodes } from '../../../../common/graphql/relay-pagination';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { GroupsService } from '../services/facades/groups.service';
import { toGroupGql } from './groups.graphql.mapper';
import { GroupConnectionGql } from './groups.graphql.types';

@Resolver()
export class GroupsRelayGraphqlResolver {
  constructor(private readonly groups: GroupsService) {}

  @Query(() => GroupConnectionGql, {
    name: 'groupsConnection',
    description:
      'ログインユーザーが閲覧できるspace一覧をRelay Connection形式で返す。',
  })
  async listGroupsConnection(
    @Args('first', { type: () => Int, defaultValue: 50 }) first: number,
    @Args('after', { type: () => String, nullable: true })
    after: string | null,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<GroupConnectionGql> {
    const nodes = (await this.groups.list(actor)).map(toGroupGql);
    return connectionFromNodes({ after, first, nodes });
  }
}
