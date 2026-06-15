import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { AuthRepository } from '../../../../../models/repositories/auth.repository';
import { MailService } from '../../../mail/services/mail.service';
import { UsersService } from '../../../users/services/users.service';
import type {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from '../../dto/auth.dto';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/**
 * パスワード再設定トークン発行・確定を扱う service。
 */
@Injectable()
export class AuthPasswordResetService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  /**
   * メールアドレスに一致する有効ユーザーへパスワード再設定メールを送信する。
   * @param dto パスワード再設定リクエストDTO
   * @returns 成功結果
   */
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = dto.email.toLowerCase();
    const users = await this.usersService.findActiveByEmail(email);

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

  /**
   * 再設定トークンを検証し、パスワードを更新する。
   * @param dto パスワード再設定確定DTO
   * @returns 成功結果
   */
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
