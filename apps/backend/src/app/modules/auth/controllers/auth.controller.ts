import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Api,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
  AuthApi,
  RateLimit,
} from '../../../decorators';
import { AuthService } from '../services/facades/auth.service';
import {
  AdminPingResponseDto,
  AuthIssueTokensResponseDto,
  AuthMeResponseDto,
  ConfirmEmailChangeDto,
  ConfirmPasswordResetDto,
  EmailChangeAcceptedResponseDto,
  LoginDto,
  PasswordResetAcceptedResponseDto,
  RegisterDto,
  RequestMeEmailChangeDto,
  RequestPasswordResetDto,
  UpdateMePasswordDto,
  UpdateMeProfileDto,
} from '../dto/auth.dto';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import type { SuccessResponse } from '../../../type';
import { successResponse } from '../../../utils';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Api()
  @RateLimit({ default: { limit: 20, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新規登録（Nest JWT 発行）' })
  @ApiSuccessResponseCreated(AuthIssueTokensResponseDto)
  async register(
    @Body() dto: RegisterDto,
  ): Promise<SuccessResponse<AuthIssueTokensResponseDto>> {
    return successResponse(await this.authService.register(dto));
  }

  @Api()
  @RateLimit({ default: { limit: 20, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログイン（Nest JWT 発行）' })
  @ApiSuccessResponse(AuthIssueTokensResponseDto)
  async login(
    @Body() dto: LoginDto,
  ): Promise<SuccessResponse<AuthIssueTokensResponseDto>> {
    return successResponse(await this.authService.login(dto));
  }

  @Api()
  @RateLimit({ default: { limit: 10, ttl: 60_000 } })
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'パスワード再設定メール送信' })
  @ApiSuccessResponse(PasswordResetAcceptedResponseDto)
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<SuccessResponse<PasswordResetAcceptedResponseDto>> {
    return successResponse(await this.authService.requestPasswordReset(dto));
  }

  @Api()
  @RateLimit({ default: { limit: 10, ttl: 60_000 } })
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'パスワード再設定の確定' })
  @ApiSuccessResponse(PasswordResetAcceptedResponseDto)
  async confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
  ): Promise<SuccessResponse<PasswordResetAcceptedResponseDto>> {
    return successResponse(await this.authService.confirmPasswordReset(dto));
  }

  @AuthApi()
  @Post('me')
  @ApiOperation({ summary: '現在のユーザ（X-API-Key + Nest JWT）' })
  @ApiSuccessResponse(AuthMeResponseDto)
  me(@CurrentUser() user: AuthUserPayload): SuccessResponse<AuthMeResponseDto> {
    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      roles: user.roles,
      tenantId: user.tenantId,
    });
  }

  @AuthApi()
  @RateLimit({ default: { limit: 30, ttl: 60_000 } })
  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログイン中ユーザの名前更新' })
  @ApiSuccessResponse(AuthIssueTokensResponseDto)
  async updateMeProfile(
    @Body() dto: UpdateMeProfileDto,
    @CurrentUser() user: AuthUserPayload,
  ): Promise<SuccessResponse<AuthIssueTokensResponseDto>> {
    return successResponse(await this.authService.updateMeProfile(dto, user));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 10, ttl: 60_000 } })
  @Post('me/email-change/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ログイン中ユーザのメールアドレス変更確認メール送信',
  })
  @ApiSuccessResponse(EmailChangeAcceptedResponseDto)
  async requestMeEmailChange(
    @Body() dto: RequestMeEmailChangeDto,
    @CurrentUser() user: AuthUserPayload,
  ): Promise<SuccessResponse<EmailChangeAcceptedResponseDto>> {
    return successResponse(
      await this.authService.requestMeEmailChange(dto, user),
    );
  }

  @Api()
  @RateLimit({ default: { limit: 20, ttl: 60_000 } })
  @Post('email-change/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'メールアドレス変更の確定' })
  @ApiSuccessResponse(EmailChangeAcceptedResponseDto)
  async confirmEmailChange(
    @Body() dto: ConfirmEmailChangeDto,
  ): Promise<SuccessResponse<EmailChangeAcceptedResponseDto>> {
    return successResponse(await this.authService.confirmEmailChange(dto));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 20, ttl: 60_000 } })
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログイン中ユーザのパスワード更新' })
  @ApiSuccessResponse(AuthIssueTokensResponseDto)
  async updateMePassword(
    @Body() dto: UpdateMePasswordDto,
    @CurrentUser() user: AuthUserPayload,
  ): Promise<SuccessResponse<AuthIssueTokensResponseDto>> {
    return successResponse(await this.authService.updateMePassword(dto, user));
  }

  @AuthApi()
  @Get('admin/ping')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: '管理者のみ（403 = ロール不足）' })
  @ApiSuccessResponse(AdminPingResponseDto)
  adminPing(): SuccessResponse<AdminPingResponseDto> {
    return successResponse({ ok: true });
  }
}
