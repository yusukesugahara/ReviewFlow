import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { User } from '../../../../../models/entities/user.entity';
import { AuthRepository } from '../../../../../models/repositories/auth.repository';
import type { AccessTokenPayload } from '../../../../../strategies/jwt.strategy';
import { UsersService } from '../../../users/services/users.service';
import { AuthEmailChangeService } from '../email-change/auth-email-change.service';
import { AuthPasswordResetService } from '../password-reset/auth-password-reset.service';
import type {
  ConfirmEmailChangeDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterDto,
  RequestMeEmailChangeDto,
  RequestPasswordResetDto,
  UpdateMePasswordDto,
  UpdateMeProfileDto,
} from '../../dto/auth.dto';

export type ApplicantAccessTokenPayload = {
  kind: 'applicant_access';
  tenantId: string;
  email: string;
  groupId: string;
  formDefinitionId?: string;
  applicationId?: string;
};

/**
 * 認証 API の facade。登録、ログイン、本人情報更新、各種トークン発行を統括する。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersService: UsersService,
    private readonly passwordResetService: AuthPasswordResetService,
    private readonly emailChangeService: AuthEmailChangeService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * tenant 管理者ユーザーと tenant を作成し、ログイン用トークンを返す。
   * @param dto 登録DTO
   * @returns アクセストークンとユーザー情報
   */
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.usersService.emailExists(email)) {
      throw clientError(ClientErrorCodes.AUTH_EMAIL_TAKEN);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const tenantName = dto.organizationName?.trim() || 'My workspace';

    const user = await this.authRepository.createTenantAdmin({
      email,
      passwordHash,
      tenantName,
    });

    return this.issueTokens(user);
  }

  /**
   * パスワード再設定メール送信を開始する。
   * @param dto パスワード再設定リクエストDTO
   * @returns 成功結果
   */
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    return this.passwordResetService.requestPasswordReset(dto);
  }

  /**
   * パスワード再設定トークンを使ってパスワードを変更する。
   * @param dto パスワード再設定確定DTO
   * @returns 成功結果
   */
  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    return this.passwordResetService.confirmPasswordReset(dto);
  }

  /**
   * ログインユーザーのメールアドレス変更確認メールを送信する。
   * @param dto メールアドレス変更リクエストDTO
   * @param actor ログインユーザー
   * @returns 成功結果
   */
  async requestMeEmailChange(
    dto: RequestMeEmailChangeDto,
    actor: {
      id: string;
      email: string;
      tenantId: string;
    },
  ) {
    return this.emailChangeService.requestMeEmailChange(dto, actor);
  }

  /**
   * メールアドレス変更確認トークンを確定する。
   * @param dto メールアドレス変更確定DTO
   * @returns 成功結果
   */
  async confirmEmailChange(dto: ConfirmEmailChangeDto) {
    return this.emailChangeService.confirmEmailChange(dto);
  }

  /**
   * ログインユーザーのプロフィールを更新し、新しいトークンを返す。
   * @param dto プロフィール更新DTO
   * @param actor ログインユーザー
   * @returns アクセストークンとユーザー情報
   */
  async updateMeProfile(
    dto: UpdateMeProfileDto,
    actor: {
      id: string;
      email: string;
      tenantId: string;
    },
  ) {
    const user = await this.usersService.updateOwnProfile(actor, dto);
    return this.issueTokens(user);
  }

  /**
   * ログインユーザーのパスワードを更新し、新しいトークンを返す。
   * @param dto パスワード更新DTO
   * @param actor ログインユーザー
   * @returns アクセストークンとユーザー情報
   */
  async updateMePassword(
    dto: UpdateMePasswordDto,
    actor: {
      id: string;
      email: string;
      tenantId: string;
    },
  ) {
    const user = await this.usersService.updateOwnPassword(actor, dto);
    return this.issueTokens(user);
  }

  /**
   * メールアドレス、任意 tenantId、パスワードでログインする。
   * @param dto ログインDTO
   * @returns アクセストークンとユーザー情報
   */
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const candidates = dto.tenantId
      ? await this.usersService.findAllByEmailAndTenant(email, dto.tenantId)
      : await this.usersService.findAllByEmail(email);
    if (candidates.length === 0) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const passwordMatches: User[] = [];
    for (const u of candidates) {
      if (await bcrypt.compare(dto.password, u.passwordHash)) {
        passwordMatches.push(u);
      }
    }
    if (passwordMatches.length === 0) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    if (passwordMatches.length > 1) {
      throw clientError(ClientErrorCodes.AUTH_TENANT_REQUIRED);
    }
    const user = passwordMatches[0];
    if (!user.isActive) {
      throw clientError(ClientErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
    return this.issueTokens(user);
  }

  /**
   * 招待受諾後など、既存ユーザに対してログイン相当のトークンを返す。
   * @param user ユーザー
   * @returns アクセストークンとユーザー情報
   */
  issueTokensForUser(user: User) {
    return this.issueTokens(user);
  }

  /**
   * 公開申請・差し戻し修正用の申請者アクセストークンを発行する。
   * @param input 申請者アクセストークン入力
   * @returns JWT
   */
  issueApplicantAccessToken(input: {
    tenantId: string;
    email: string;
    groupId: string;
    formDefinitionId?: string;
    applicationId?: string;
  }): string {
    const payload: ApplicantAccessTokenPayload = {
      kind: 'applicant_access',
      tenantId: input.tenantId,
      email: input.email,
      groupId: input.groupId,
      formDefinitionId: input.formDefinitionId,
      applicationId: input.applicationId,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * 申請者アクセストークンを検証し、payload を返す。
   * @param token JWT
   * @returns 申請者アクセストークン payload
   */
  verifyApplicantAccessToken(token: string): ApplicantAccessTokenPayload {
    const payload = this.jwtService.verify<ApplicantAccessTokenPayload>(token);
    if (
      payload.kind !== 'applicant_access' ||
      !payload.tenantId ||
      !payload.email ||
      !payload.groupId
    ) {
      throw clientError(ClientErrorCodes.AUTH_JWT_UNAUTHORIZED);
    }
    return payload;
  }

  /**
   * ログイン用アクセストークンとユーザー情報を組み立てる。
   * @param user ユーザー
   * @returns アクセストークンとユーザー情報
   */
  private issueTokens(user: User) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
