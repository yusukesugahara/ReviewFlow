import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  GroupMemberRole,
  type GroupMemberRoleValue,
} from '../constants/group-member-role';
import { GroupMember } from '../entities/group-member.entity';
import { Group } from '../entities/group.entity';

type CreateGroupWithAdminsParams = {
  tenantId: string;
  name: string;
  description?: string | null;
  createdByUserId: string;
  adminUserIds: string[];
};

@Injectable()
export class GroupsRepository {
  constructor(
    @InjectRepository(Group)
    private readonly groups: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findGroupsByTenant(tenantId: string): Promise<Group[]> {
    return this.groups.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  findMembershipsByTenantAndUser(
    tenantId: string,
    userId: string,
  ): Promise<GroupMember[]> {
    return this.members.find({
      where: { tenantId, userId },
    });
  }

  findMembershipsWithGroupsByTenantAndUser(
    tenantId: string,
    userId: string,
  ): Promise<GroupMember[]> {
    return this.members.find({
      where: { tenantId, userId },
      relations: { group: true },
      order: { createdAt: 'ASC' },
    });
  }

  findGroupByTenantAndName(
    tenantId: string,
    name: string,
  ): Promise<Group | null> {
    return this.groups.findOne({
      where: { tenantId, name },
    });
  }

  findGroupByIdInTenant(
    groupId: string,
    tenantId: string,
  ): Promise<Group | null> {
    return this.groups.findOne({
      where: { id: groupId, tenantId },
    });
  }

  async createGroupWithAdmins(params: CreateGroupWithAdminsParams) {
    return this.dataSource.transaction(async (manager) => {
      const groupRepo = manager.getRepository(Group);
      const memberRepo = manager.getRepository(GroupMember);

      const group = await groupRepo.save(
        groupRepo.create({
          tenantId: params.tenantId,
          name: params.name,
          description: params.description?.trim().length
            ? params.description.trim()
            : null,
          createdByUserId: params.createdByUserId,
        }),
      );

      await memberRepo.save(
        params.adminUserIds.map((userId) =>
          memberRepo.create({
            tenantId: params.tenantId,
            groupId: group.id,
            userId,
            role: GroupMemberRole.ADMIN,
            invitedByUserId: params.createdByUserId,
          }),
        ),
      );

      return group;
    });
  }

  saveGroup(group: Group): Promise<Group> {
    return this.groups.save(group);
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.groups.delete(groupId);
  }

  findMembersWithUsers(
    tenantId: string,
    groupId: string,
  ): Promise<GroupMember[]> {
    return this.members.find({
      where: { tenantId, groupId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  findMembershipsByGroup(
    tenantId: string,
    groupId: string,
  ): Promise<GroupMember[]> {
    return this.members.find({ where: { tenantId, groupId } });
  }

  findMember(
    tenantId: string,
    groupId: string,
    userId: string,
  ): Promise<GroupMember | null> {
    return this.members.findOne({
      where: { tenantId, groupId, userId },
      relations: { user: true },
    });
  }

  findAdminMember(
    tenantId: string,
    groupId: string,
    userId: string,
  ): Promise<GroupMember | null> {
    return this.members.findOne({
      where: {
        tenantId,
        groupId,
        userId,
        role: GroupMemberRole.ADMIN,
      },
    });
  }

  async createMember(params: {
    tenantId: string;
    groupId: string;
    userId: string;
    role: GroupMemberRoleValue;
    invitedByUserId: string;
  }): Promise<GroupMember> {
    return this.members.save(
      this.members.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        userId: params.userId,
        role: params.role,
        invitedByUserId: params.invitedByUserId,
      }),
    );
  }

  async saveMember(member: GroupMember): Promise<GroupMember> {
    const saved = await this.members.save(member);
    return this.members.findOneOrFail({
      where: { id: saved.id },
      relations: { user: true },
    });
  }

  async deleteMember(memberId: string): Promise<void> {
    await this.members.delete(memberId);
  }

  findAdmins(tenantId: string, groupId: string): Promise<GroupMember[]> {
    return this.members.find({
      where: {
        tenantId,
        groupId,
        role: GroupMemberRole.ADMIN,
      },
    });
  }

  countGroupInTenant(tenantId: string, groupId: string): Promise<number> {
    return this.groups.count({ where: { id: groupId, tenantId } });
  }
}
