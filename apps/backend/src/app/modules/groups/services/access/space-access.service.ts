import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { UserRole } from '../../../../../models/constants/user-role';
import { GroupsRepository } from '../../../../../models/repositories/groups.repository';

@Injectable()
export class SpaceAccessService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  async assertGroupInTenant(tenantId: string, groupId: string): Promise<void> {
    const count = await this.groupsRepository.countGroupInTenant(
      tenantId,
      groupId,
    );
    if (count === 0) {
      throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
    }
  }

  async assertCanUseGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<void> {
    await this.assertGroupInTenant(actor.tenantId, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return;
    }
    const member = await this.groupsRepository.findMember(
      actor.tenantId,
      groupId,
      actor.id,
    );
    if (!member) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  async assertCanManageGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<void> {
    await this.assertGroupInTenant(actor.tenantId, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return;
    }
    const member = await this.groupsRepository.findAdminMember(
      actor.tenantId,
      groupId,
      actor.id,
    );
    if (!member) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  async actorCanManageGroup(
    actor: AuthUserPayload,
    groupId: string,
  ): Promise<boolean> {
    await this.assertGroupInTenant(actor.tenantId, groupId);
    if (actor.roles.includes(UserRole.TENANT_ADMIN)) {
      return true;
    }
    const member = await this.groupsRepository.findAdminMember(
      actor.tenantId,
      groupId,
      actor.id,
    );
    return !!member;
  }
}
