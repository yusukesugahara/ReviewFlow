import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { AuthRepository } from '../../../../models/repositories/auth.repository';
import { MailService } from '../../mail/services/mail.service';
import { UsersService } from '../../users/services/users.service';
import type {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from '../dto/auth.dto';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthPasswordResetService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = dto.email.toLowerCase();
    const users = (await this.usersService.findAllByEmail(email)).filter(
      (user) => user.isActive,
    );

    for (const user of users) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      const saved = await this.authRepository.createPasswordResetToken({
        tenantId: user.tenantId,
        userId: user.id,
        email: user.email,
        token,
        expiresAt,
      });

      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        resetToken: saved.token,
        expiresAtIso: saved.expiresAt.toISOString(),
      });
    }

    return { ok: true };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const row = await this.authRepository.findPasswordResetToken(dto.token);
    if (!row || row.usedAt || new Date() > row.expiresAt) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.authRepository.updatePasswordAndMarkResetTokenUsed({
      tokenRow: row,
      passwordHash,
    });

    return { ok: true };
  }
}
