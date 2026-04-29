import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { GroupMemberRole } from '../../../models/constants/group-member-role';
import { UserRole } from '../../../models/constants/user-role';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';

@Injectable()
export class SpaceAccessService {
  constructor(
    @InjectRepository(Group)
    private readonly groups: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
  ) {}

  async assertGroupInTenant(tenantId: string, groupId: string): Promise<void> {
    const count = await this.groups.count({ where: { id: groupId, tenantId } });
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
    const member = await this.members.findOne({
      where: { tenantId: actor.tenantId, groupId, userId: actor.id },
    });
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
    const member = await this.members.findOne({
      where: {
        tenantId: actor.tenantId,
        groupId,
        userId: actor.id,
        role: GroupMemberRole.ADMIN,
      },
    });
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
    const member = await this.members.findOne({
      where: {
        tenantId: actor.tenantId,
        groupId,
        userId: actor.id,
        role: GroupMemberRole.ADMIN,
      },
    });
    return !!member;
  }
}
