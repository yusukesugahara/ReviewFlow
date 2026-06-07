import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { GroupMemberRole } from '../../../../models/constants/group-member-role';
import {
  InvitationRepositoryError,
  InvitationsRepository,
} from '../../../../models/repositories/invitations.repository';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { AuthService } from '../../auth/services/auth.service';
import { MailService } from '../../mail/services/mail.service';
import { UsersService } from '../../users/services/users.service';
import type {
  AcceptInvitationDto,
  CreateInvitationDto,
} from '../dto/invitations.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly invitationsRepository: InvitationsRepository,
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

    const pending =
      await this.invitationsRepository.findPendingByTenantAndEmail(
        tenantId,
        email,
      );
    if (pending) {
      throw clientError(ClientErrorCodes.INVITATION_PENDING_EXISTS);
    }

    if (dto.groupId) {
      const groupExists = await this.invitationsRepository.groupExistsInTenant(
        tenantId,
        dto.groupId,
      );
      if (!groupExists) {
        throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
      }
      if (!this.canCreateTenantInvitation(actor)) {
        const member = await this.invitationsRepository.findGroupAdminMember({
          tenantId,
          groupId: dto.groupId,
          userId: actor.id,
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

    const saved = await this.invitationsRepository.createInvitation({
      tenantId,
      email,
      role: dto.role,
      groupId: dto.groupId ?? null,
      groupRole: dto.groupId ? (dto.groupRole ?? GroupMemberRole.USER) : null,
      token,
      invitedByUserId: actor.id,
      expiresAt,
    });

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
      await this.invitationsRepository.deleteInvitation(saved.id);
      throw new InternalServerErrorException('failed to send invitation email');
    }

    return {
      id: saved.id,
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

    const user = await this.acceptInvitationOrThrow({
      token: dto.token,
      passwordHash,
      name,
    });

    return this.authService.issueTokensForUser(user);
  }

  private async acceptInvitationOrThrow(params: {
    token: string;
    passwordHash: string;
    name: string | null;
  }) {
    try {
      return await this.invitationsRepository.acceptInvitation(params);
    } catch (error) {
      if (!(error instanceof InvitationRepositoryError)) {
        throw error;
      }
      if (error.reason === 'not_found') {
        throw clientError(ClientErrorCodes.INVITATION_NOT_FOUND);
      }
      if (error.reason === 'member_exists') {
        throw clientError(ClientErrorCodes.INVITATION_MEMBER_EXISTS);
      }
      if (error.reason === 'group_not_found') {
        throw clientError(ClientErrorCodes.GROUP_NOT_FOUND);
      }
      throw clientError(ClientErrorCodes.INVITATION_NOT_ACCEPTABLE);
    }
  }

  private canCreateTenantInvitation(actor: AuthUserPayload): boolean {
    return actor.roles.includes('tenant_admin');
  }
}
