import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  Api,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
  AuthApi,
} from '../../decorators';
import { AuthService } from './auth.service';
import {
  AdminPingResponseDto,
  AuthIssueTokensResponseDto,
  AuthMeResponseDto,
  ConfirmPasswordResetDto,
  LoginDto,
  PasswordResetAcceptedResponseDto,
  RegisterDto,
  RequestPasswordResetDto,
} from './auth.dto';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../decorators/current-user.decorator';
import { Roles } from '../../../decorators/roles.decorator';
import { UserRole } from '../../../models/constants/user-role';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Api()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
  @ApiOperation({ summary: '現在のユーザー（X-API-Key + Nest JWT）' })
  @ApiSuccessResponse(AuthMeResponseDto)
  me(@CurrentUser() user: AuthUserPayload): SuccessResponse<AuthMeResponseDto> {
    return successResponse({
      id: user.id,
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
    });
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
