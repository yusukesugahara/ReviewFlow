import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { connectionFromNodes } from '../../../../common/graphql/relay-pagination';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { UsersService } from '../services/users.service';
import { toUserGql } from './users.graphql.mapper';
import { UserConnectionGql } from './users.graphql.types';

@Resolver()
export class UsersRelayGraphqlResolver {
  constructor(private readonly users: UsersService) {}

  @Query(() => UserConnectionGql, {
    name: 'usersConnection',
    description:
      'tenant管理者が閲覧できるユーザー一覧をRelay Connection形式で返す。',
  })
  @Roles(UserRole.TENANT_ADMIN)
  async listUsersConnection(
    @Args('first', { type: () => Int, defaultValue: 50 }) first: number,
    @Args('after', { type: () => String, nullable: true })
    after: string | null,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<UserConnectionGql> {
    const nodes = (await this.users.findAllByTenant(actor.tenantId)).map(
      toUserGql,
    );
    return connectionFromNodes({ after, first, nodes });
  }
}
