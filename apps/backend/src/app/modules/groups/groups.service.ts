import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { GroupMemberRole } from '../../../models/constants/group-member-role';
import { UserRole } from '../../../models/constants/user-role';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { User } from '../../../models/entities/user.entity';
import { UsersService } from '../users/users.service';
import type {
  AddGroupMemberDto,
  CreateGroupDto,
  UpdateGroupMemberRoleDto,
} from './groups.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groups: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
  ) {}

  async list(actor: AuthUserPayload): Promise<Group[]> {
    if (this.isSystemAdmin(actor)) {
      return this.groups.find({
        where: { tenantId: actor.tenantId },
        order: { createdAt: 'ASC' },
      });
    }

    const rows = await this.members.find({
      where: { tenantId: actor.tenantId, userId: actor.id },
      relations: { group: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => row.group);
  }

  async create(dto: CreateGroupDto, actor: AuthUserPayload): Promise<Group> {
    const name = dto.name.trim();
    if (!name.length) {
      throw clientError(ClientErrorCodes.GROUP_NAME_EXISTS);
    }

    const exists = await this.groups.findOne({
      where: { tenantId: actor.tenantId, name },
    });
    if (exists) {
      throw clientError(ClientErrorCodes.GROUP_NAME_EXISTS);
    }

    const adminUserIds = Array.from(new Set(dto.adminUserIds));
    const users = await this.usersService.findAllByIdsInTenant(
      actor.tenantId,
      adminUserIds,
    );
    if (users.length !== adminUserIds.length) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    return this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(Group);
      const memberRepo = manager.getRepository(GroupMember);

      const group = await groupRepo.save(
        groupRepo.create({
          tenantId: actor.tenantId,
          name,
          description: dto.description?.trim().length
            ? dto.description.trim()
            : null,
          createdByUserId: actor.id,
        }),
      );

      await memberRepo.save(
        adminUserIds.map((userId) =>
          memberRepo.create({
            tenantId: actor.tenantId,
            groupId: group.id,
            userId,
            role: GroupMemberRole.ADMIN,
            invitedByUserId: actor.id,
          }),
        ),
      );

      return group;
    });
  }

  async remove(groupId: string, actor: AuthUserPayload): Promise<void> {
    const group = await this.findGroupInTenant(groupId, actor.tenantId);
    await this.groups.delete(group.id);
  }

  async listMembers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<GroupMember[]> {
    await this.assertCanManageGroup(groupId, actor);
    return this.members.find({
      where: { tenantId: actor.tenantId, groupId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  async listAvailableUsers(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<User[]> {
    await this.assertCanManageGroup(groupId, actor);
    const [users, members] = await Promise.all([
      this.usersService.findAllByTenant(actor.tenantId),
      this.members.find({ where: { tenantId: actor.tenantId, groupId } }),
    ]);
    const memberUserIds = new Set(members.map((member) => member.userId));
    return users.filter((user) => !memberUserIds.has(user.id));
  }

  async addMember(
    groupId: string,
    dto: AddGroupMemberDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    await this.assertTenantAdminCanManageGroup(groupId, actor);

    const user = await this.usersService.findByIdAndTenant(
      dto.userId,
      actor.tenantId,
    );
    if (!user) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    const exists = await this.members.findOne({
      where: { tenantId: actor.tenantId, groupId, userId: dto.userId },
    });
    if (exists) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_EXISTS);
    }

    const saved = await this.members.save(
      this.members.create({
        tenantId: actor.tenantId,
        groupId,
        userId: dto.userId,
        role: dto.role,
        invitedByUserId: actor.id,
      }),
    );

    saved.user = user;
    return saved;
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    dto: UpdateGroupMemberRoleDto,
    actor: AuthUserPayload,
  ): Promise<GroupMember> {
    await this.assertCanManageGroup(groupId, actor);

    const member = await this.findMember(groupId, userId, actor.tenantId);
    if (
      member.role === GroupMemberRole.ADMIN &&
      dto.role !== GroupMemberRole.ADMIN
    ) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, userId);
    }

    member.role = dto.role;
    const saved = await this.members.save(member);
    return this.members.findOneOrFail({
      where: { id: saved.id },
      relations: { user: true },
    });
  }

  async removeMember(
    groupId: string,
    userId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.assertCanManageGroup(groupId, actor);

    const member = await this.findMember(groupId, userId, actor.tenantId);
    if (member.role === GroupMemberRole.ADMIN) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, userId);
    }

    await this.members.delete(member.id);
  }

  async leave(groupId: string, actor: AuthUserPayload): Promise<void> {
    await this.findGroupInTenant(groupId, actor.tenantId);

    const member = await this.findMember(groupId, actor.id, actor.tenantId);
    if (member.role === GroupMemberRole.ADMIN) {
      await this.assertAnotherAdminRemains(groupId, actor.tenantId, actor.id);
    }

    await this.members.delete(member.id);
  }

  private async findGroupInTenant(
    groupId: string,
    tenantId: string,
  ): Promise<Group> {
    const group = await this.groups.findOne({
      where: { id: groupId, tenantId },
    });
    if (!group) {
      throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
    }
    return group;
  }

  private async findMember(
    groupId: string,
    userId: string,
    tenantId: string,
  ): Promise<GroupMember> {
    const member = await this.members.findOne({
      where: { tenantId, groupId, userId },
      relations: { user: true },
    });
    if (!member) {
      throw clientError(ClientErrorCodes.GROUP_MEMBER_NOT_FOUND);
    }
    return member;
  }

  private async assertCanManageGroup(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.findGroupInTenant(groupId, actor.tenantId);
    if (this.isSystemAdmin(actor)) {
      return;
    }

    const actorMember = await this.members.findOne({
      where: {
        tenantId: actor.tenantId,
        groupId,
        userId: actor.id,
        role: GroupMemberRole.ADMIN,
      },
    });
    if (!actorMember) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  private async assertTenantAdminCanManageGroup(
    groupId: string,
    actor: AuthUserPayload,
  ): Promise<void> {
    await this.findGroupInTenant(groupId, actor.tenantId);
    if (!this.isSystemAdmin(actor)) {
      throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
    }
  }

  private async assertAnotherAdminRemains(
    groupId: string,
    tenantId: string,
    exceptUserId: string,
  ): Promise<void> {
    const admins = await this.members.find({
      where: {
        tenantId,
        groupId,
        role: GroupMemberRole.ADMIN,
      },
    });
    const another = admins.some((admin) => admin.userId !== exceptUserId);
    if (!another) {
      throw clientError(ClientErrorCodes.LAST_GROUP_ADMIN_PROTECTED);
    }
  }

  private isSystemAdmin(actor: AuthUserPayload): boolean {
    return actor.roles.includes(UserRole.TENANT_ADMIN);
  }
}
