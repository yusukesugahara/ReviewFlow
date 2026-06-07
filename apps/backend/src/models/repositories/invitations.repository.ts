import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GroupMemberRole } from '../constants/group-member-role';
import { InvitationStatus } from '../constants/invitation-status';
import type { UserRoleValue } from '../constants/user-role';
import type { GroupMemberRoleValue } from '../constants/group-member-role';
import { GroupMember } from '../entities/group-member.entity';
import { Group } from '../entities/group.entity';
import { Invitation } from '../entities/invitation.entity';
import { User } from '../entities/user.entity';

export type CreateInvitationParams = {
  tenantId: string;
  email: string;
  role: UserRoleValue;
  groupId: string | null;
  groupRole: GroupMemberRoleValue | null;
  token: string;
  invitedByUserId: string;
  expiresAt: Date;
};

export type AcceptInvitationParams = {
  token: string;
  passwordHash: string;
  name: string | null;
};

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findPendingByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<Invitation | null> {
    return this.invitations.findOne({
      where: {
        tenantId,
        email,
        status: InvitationStatus.PENDING,
      },
    });
  }

  async groupExistsInTenant(
    tenantId: string,
    groupId: string,
  ): Promise<boolean> {
    const group = await this.dataSource.getRepository(Group).findOne({
      where: { id: groupId, tenantId },
    });
    return !!group;
  }

  findGroupAdminMember(params: {
    tenantId: string;
    groupId: string;
    userId: string;
  }): Promise<GroupMember | null> {
    return this.dataSource.getRepository(GroupMember).findOne({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        userId: params.userId,
        role: GroupMemberRole.ADMIN,
      },
    });
  }

  createInvitation(params: CreateInvitationParams): Promise<Invitation> {
    return this.invitations.save(
      this.invitations.create({
        tenantId: params.tenantId,
        email: params.email,
        role: params.role,
        groupId: params.groupId,
        groupRole: params.groupRole,
        token: params.token,
        status: InvitationStatus.PENDING,
        invitedByUserId: params.invitedByUserId,
        expiresAt: params.expiresAt,
      }),
    );
  }

  async deleteInvitation(id: string): Promise<void> {
    await this.invitations.delete(id);
  }

  async acceptInvitation(params: AcceptInvitationParams): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Invitation);
      const userRepo = manager.getRepository(User);
      const groupRepo = manager.getRepository(Group);
      const memberRepo = manager.getRepository(GroupMember);

      const invitation = await invRepo.findOne({
        where: { token: params.token },
      });
      if (!invitation) {
        throw new InvitationRepositoryError('not_found');
      }
      if (invitation.status !== InvitationStatus.PENDING) {
        throw new InvitationRepositoryError('not_acceptable');
      }
      if (new Date() > invitation.expiresAt) {
        throw new InvitationRepositoryError('not_acceptable');
      }

      const duplicate = await userRepo.findOne({
        where: { tenantId: invitation.tenantId, email: invitation.email },
      });
      if (duplicate) {
        throw new InvitationRepositoryError('member_exists');
      }

      const newUser = userRepo.create({
        tenantId: invitation.tenantId,
        email: invitation.email,
        passwordHash: params.passwordHash,
        role: invitation.role,
        name: params.name,
        isActive: true,
      });
      await userRepo.save(newUser);

      if (invitation.groupId) {
        const group = await groupRepo.findOne({
          where: { id: invitation.groupId, tenantId: invitation.tenantId },
        });
        if (!group) {
          throw new InvitationRepositoryError('group_not_found');
        }

        await memberRepo.save(
          memberRepo.create({
            tenantId: invitation.tenantId,
            groupId: invitation.groupId,
            userId: newUser.id,
            role: invitation.groupRole ?? GroupMemberRole.USER,
            invitedByUserId: invitation.invitedByUserId,
          }),
        );
      }

      invitation.status = InvitationStatus.ACCEPTED;
      await invRepo.save(invitation);

      return newUser;
    });
  }
}

export class InvitationRepositoryError extends Error {
  constructor(
    public readonly reason:
      | 'not_found'
      | 'not_acceptable'
      | 'member_exists'
      | 'group_not_found',
  ) {
    super(reason);
  }
}
