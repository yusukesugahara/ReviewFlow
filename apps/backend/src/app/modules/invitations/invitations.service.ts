import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../common/errors';
import { InvitationStatus } from '../../../models/constants/invitation-status';
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

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const row = this.invitations.create({
      tenantId,
      email,
      role: dto.role,
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
      expiresAt: saved.expiresAt.toISOString(),
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const name = dto.name?.trim().length ? dto.name.trim() : null;

    const user = await this.dataSource.transaction(async (manager) => {
      const invRepo = manager.getRepository(Invitation);
      const userRepo = manager.getRepository(User);

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

      inv.status = InvitationStatus.ACCEPTED;
      await invRepo.save(inv);

      return newUser;
    });

    return this.authService.issueTokensForUser(user);
  }
}
