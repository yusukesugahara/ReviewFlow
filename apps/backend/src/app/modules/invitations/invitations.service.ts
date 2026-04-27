import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { GroupMemberRole } from '../../../models/constants/group-member-role';
import { InvitationStatus } from '../../../models/constants/invitation-status';
import { GroupMember } from '../../../models/entities/group-member.entity';
import { Group } from '../../../models/entities/group.entity';
import { Invitation } from '../../../models/entities/invitation.entity';
import { User } from '../../../models/entities/user.entity';
import type { AuthUserPayload } from '../../../decorators/current-user.decorator';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import type { AcceptInvitationDto, CreateInvitationDto } from './invitations.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateInvitationDto, actor: AuthUserPayload) {
    const email = dto.email.toLowerCase();
    const tenantId = actor.tenantId;

    const existingUser = await this.usersService.findByTenantAndEmail(
      tenantId,
      email,
    );
    if (existingUser) {
      throw clientError(ClientErrorCodes.INVITATION_MEMBER_EXISTS);
    }

    const pending = await this.invitations.findOne({
      where: {
        tenantId,
        email,
        status: InvitationStatus.PENDING,
      },
    });
    if (pending) {
      throw clientError(ClientErrorCodes.INVITATION_PENDING_EXISTS);
    }

    if (dto.groupId) {
      const group = await this.dataSource.getRepository(Group).findOne({
        where: { id: dto.groupId, tenantId },
      });
      if (!group) {
        throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
      }
      if (!this.canCreateTenantInvitation(actor)) {
        const member = await this.dataSource.getRepository(GroupMember).findOne({
          where: {
            tenantId,
            groupId: dto.groupId,
            userId: actor.id,
            role: GroupMemberRole.ADMIN,
          },
        });
        if (!member) {
          throw clientError(ClientErrorCodes.GROUP_ADMIN_REQUIRED);
        }
      }
    } else if (!this.canCreateTenantInvitation(actor)) {
      throw clientError(ClientErrorCodes.AUTH_FORBIDDEN_ROLE);
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const row = this.invitations.create({
      tenantId,
      email,
      role: dto.role,
      groupId: dto.groupId ?? null,
      groupRole: dto.groupId
        ? (dto.groupRole ?? GroupMemberRole.USER)
        : null,
      token,
      status: InvitationStatus.PENDING,
      invitedByUserId: actor.id,
      expiresAt,
    });
    const saved = await this.invitations.save(row);

    try {
      await this.mailService.sendInvitationEmail({
        to: saved.email,
        invitedByEmail: actor.email,
        acceptToken: saved.token,
        expiresAtIso: saved.expiresAt.toISOString(),
        role: saved.role,
      });
    } catch (error) {
      this.logger.error(
        `failed to send invitation email to ${saved.email}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.invitations.delete(saved.id);
      throw new InternalServerErrorException(
        'failed to send invitation email',
      );
    }

    return {
      id: saved.id,
      token: saved.token,
      email: saved.email,
      role: saved.role,
      groupId: saved.groupId,
      groupRole: saved.groupRole,
      expiresAt: saved.expiresAt.toISOString(),
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const name = dto.name?.trim().length ? dto.name.trim() : null;

    const user = await this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Invitation);
      const userRepo = manager.getRepository(User);
      const groupRepo = manager.getRepository(Group);
      const memberRepo = manager.getRepository(GroupMember);

      const inv = await invRepo.findOne({ where: { token: dto.token } });
      if (!inv) {
        throw clientError(ClientErrorCodes.INVITATION_NOT_FOUND);
      }
      if (inv.status !== InvitationStatus.PENDING) {
        throw clientError(ClientErrorCodes.INVITATION_NOT_ACCEPTABLE);
      }
      if (new Date() > inv.expiresAt) {
        throw clientError(ClientErrorCodes.INVITATION_NOT_ACCEPTABLE);
      }

      const dup = await userRepo.findOne({
        where: { tenantId: inv.tenantId, email: inv.email },
      });
      if (dup) {
        throw clientError(ClientErrorCodes.INVITATION_MEMBER_EXISTS);
      }

      const newUser = userRepo.create({
        tenantId: inv.tenantId,
        email: inv.email,
        passwordHash,
        role: inv.role,
        name,
        isActive: true,
      });
      await userRepo.save(newUser);

      if (inv.groupId) {
        const group = await groupRepo.findOne({
          where: { id: inv.groupId, tenantId: inv.tenantId },
        });
        if (!group) {
          throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
        }

        await memberRepo.save(
          memberRepo.create({
            tenantId: inv.tenantId,
            groupId: inv.groupId,
            userId: newUser.id,
            role: inv.groupRole ?? GroupMemberRole.USER,
            invitedByUserId: inv.invitedByUserId,
          }),
        );
      }

      inv.status = InvitationStatus.ACCEPTED;
      await invRepo.save(inv);

      return newUser;
    });

    return this.authService.issueTokensForUser(user);
  }

  private canCreateTenantInvitation(actor: AuthUserPayload): boolean {
    return (
      actor.roles.includes('tenant_admin') ||
      actor.roles.includes('platform_admin')
    );
  }
}
