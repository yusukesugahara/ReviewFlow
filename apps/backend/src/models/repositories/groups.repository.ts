import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  GroupMemberRole,
  type GroupMemberRoleValue,
} from '../constants/group-member-role';
import { GroupMember } from '../entities/group-member.entity';
import { Group } from '../entities/group.entity';
import { User } from '../entities/user.entity';

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
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findGroupsByTenantWithCurrentUserRole(
    tenantId: string,
    userId: string,
  ): Promise<Group[]> {
    const result = await this.groups
      .createQueryBuilder('space')
      .leftJoin(
        GroupMember,
        'currentMember',
        [
          'currentMember.tenantId = space.tenantId',
          'currentMember.groupId = space.id',
          'currentMember.userId = :userId',
        ].join(' AND '),
        { userId },
      )
      .addSelect('currentMember.role', 'currentUserRole')
      .where('space.tenantId = :tenantId', { tenantId })
      .orderBy('space.createdAt', 'ASC')
      .getRawAndEntities<{
        currentUserRole?: GroupMemberRoleValue | null;
      }>();

    return result.entities.map((group, index) =>
      Object.assign(group, {
        currentUserRole: result.raw[index]?.currentUserRole ?? null,
      }),
    );
  }

  async findGroupsByMembershipForUser(
    tenantId: string,
    userId: string,
  ): Promise<Group[]> {
    const rows = await this.members.find({
      where: { tenantId, userId },
      relations: { group: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) =>
      Object.assign(row.group, { currentUserRole: row.role }),
    );
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

  async createGroupWithAdmins(
    params: CreateGroupWithAdminsParams,
    manager?: EntityManager,
  ) {
    const work = async (manager: EntityManager) => {
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
    };
    return manager ? work(manager) : this.dataSource.transaction(work);
  }

  saveGroup(group: Group, manager?: EntityManager): Promise<Group> {
    const repository = manager?.getRepository(Group) ?? this.groups;
    return repository.save(group);
  }

  async deleteGroup(groupId: string, manager?: EntityManager): Promise<void> {
    const repository = manager?.getRepository(Group) ?? this.groups;
    await repository.delete(groupId);
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

  findAvailableUsersForGroup(
    tenantId: string,
    groupId: string,
  ): Promise<User[]> {
    return this.users
      .createQueryBuilder('user')
      .leftJoin(
        GroupMember,
        'member',
        [
          'member.tenantId = user.tenantId',
          'member.userId = user.id',
          'member.groupId = :groupId',
        ].join(' AND '),
        { groupId },
      )
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('member.id IS NULL')
      .orderBy('user.createdAt', 'ASC')
      .getMany();
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

  async createMember(
    params: {
      tenantId: string;
      groupId: string;
      userId: string;
      role: GroupMemberRoleValue;
      invitedByUserId: string;
    },
    manager?: EntityManager,
  ): Promise<GroupMember> {
    const repository = manager?.getRepository(GroupMember) ?? this.members;
    return repository.save(
      repository.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        userId: params.userId,
        role: params.role,
        invitedByUserId: params.invitedByUserId,
      }),
    );
  }

  async saveMember(
    member: GroupMember,
    manager?: EntityManager,
  ): Promise<GroupMember> {
    const repository = manager?.getRepository(GroupMember) ?? this.members;
    const saved = await repository.save(member);
    return repository.findOneOrFail({
      where: { id: saved.id },
      relations: { user: true },
    });
  }

  async deleteMember(memberId: string, manager?: EntityManager): Promise<void> {
    const repository = manager?.getRepository(GroupMember) ?? this.members;
    await repository.delete(memberId);
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
