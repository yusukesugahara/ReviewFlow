import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { toValidatedInput } from '../../../../common/graphql/graphql-input';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import { UpdateUserRoleDto } from '../dto/users.dto';
import { UsersService } from '../services/users.service';

@Resolver()
export class UsersBusinessGraphqlResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => GraphQLJSON, { name: 'users' })
  @Roles(UserRole.TENANT_ADMIN)
  async list(@CurrentUser() actor: AuthUserPayload) {
    const rows = await this.usersService.findAllByTenant(actor.tenantId);
    return { users: rows.map(toSummary) };
  }

  @Mutation(() => GraphQLJSON, { name: 'updateUserRole' })
  @Roles(UserRole.TENANT_ADMIN)
  async updateRole(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input', { type: () => GraphQLJSON }) input: unknown,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const dto = toValidatedInput(UpdateUserRoleDto, input);
    const updated = await this.usersService.updateRoleInTenant(
      actor.tenantId,
      id,
      dto.role,
      actor,
    );
    return toSummary(updated);
  }

  @Mutation(() => GraphQLJSON, { name: 'restoreUser' })
  @Roles(UserRole.TENANT_ADMIN)
  async restore(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const restored = await this.usersService.restoreInTenant(
      actor.tenantId,
      id,
      actor,
    );
    return toSummary(restored);
  }

  @Mutation(() => Boolean, { name: 'removeUser' })
  @Roles(UserRole.TENANT_ADMIN)
  async remove(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.usersService.deactivateInTenant(actor.tenantId, id, actor);
    return true;
  }
}

function toSummary(u: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}
