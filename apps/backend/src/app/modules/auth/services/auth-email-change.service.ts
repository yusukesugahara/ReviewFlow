import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { AuthRepository } from '../../../../models/repositories/auth.repository';
import {
  BusinessAuditAction,
  BusinessAuditLogService,
} from '../../audit-logs/services/business-audit-log.service';
import { MailService } from '../../mail/services/mail.service';
import { UsersService } from '../../users/services/users.service';
import type {
  ConfirmEmailChangeDto,
  RequestMeEmailChangeDto,
} from '../dto/auth.dto';

const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthEmailChangeService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly auditLogs: BusinessAuditLogService,
  ) {}

  async requestMeEmailChange(
    dto: RequestMeEmailChangeDto,
    actor: {
      id: string;
      email: string;
      tenantId: string;
    },
  ) {
    const target = await this.usersService.findByIdAndTenant(
      actor.id,
      actor.tenantId,
    );
    if (!target || !target.isActive) {
      throw clientError(ClientErrorCodes.TENANT_USER_NOT_FOUND);
    }

    const nextEmail = dto.email.trim().toLowerCase();
    if (nextEmail === target.email) {
      throw clientError(ClientErrorCodes.AUTH_EMAIL_UNCHANGED);
    }

    await this.assertEmailAvailable(nextEmail, target.id);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MS);
    const saved = await this.authRepository.createEmailChangeToken({
      tenantId: target.tenantId,
      userId: target.id,
      currentEmail: target.email,
      newEmail: nextEmail,
      token,
      expiresAt,
    });

    await this.mailService.sendEmailChangeConfirmationEmail({
      to: saved.newEmail,
      currentEmail: saved.currentEmail,
      newEmail: saved.newEmail,
      confirmToken: saved.token,
      expiresAtIso: saved.expiresAt.toISOString(),
    });

    return { ok: true };
  }

  async confirmEmailChange(dto: ConfirmEmailChangeDto) {
    const row = await this.authRepository.findEmailChangeToken(dto.token);
    if (!row || row.usedAt || new Date() > row.expiresAt) {
      throw clientError(ClientErrorCodes.AUTH_EMAIL_CHANGE_TOKEN_INVALID);
    }

    const target = await this.usersService.findByIdAndTenant(
      row.userId,
      row.tenantId,
    );
    if (!target || !target.isActive || target.email !== row.currentEmail) {
      throw clientError(ClientErrorCodes.AUTH_EMAIL_CHANGE_TOKEN_INVALID);
    }

    await this.assertEmailAvailable(row.newEmail, target.id);

    const saved =
      await this.authRepository.updateEmailAndMarkEmailChangeTokenUsed({
        tokenRow: row,
        email: row.newEmail,
      });
    await this.auditLogs.recordUserEvent({
      actionType: BusinessAuditAction.USER_PROFILE_UPDATED,
      actor: { id: target.id, email: row.currentEmail },
      target: saved,
      summary: `${row.currentEmail} confirmed email change to ${saved.email}`,
      metadataJson: {
        emailFrom: row.currentEmail,
        emailTo: saved.email,
      },
    });

    return { ok: true };
  }

  private async assertEmailAvailable(
    email: string,
    currentUserId: string,
  ): Promise<void> {
    const usersWithEmail = await this.usersService.findAllByEmail(email);
    if (usersWithEmail.some((user) => user.id !== currentUserId)) {
      throw clientError(ClientErrorCodes.AUTH_EMAIL_TAKEN);
    }
  }
}
