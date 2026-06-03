import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  Api,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
  AuthApi,
} from '../../decorators';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../decorators/current-user.decorator';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import { AuthIssueTokensResponseDto } from '../auth/auth.dto';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
  CreateInvitationResponseDto,
} from './invitations.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @AuthApi()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'メンバー招待（tenant_admin / space admin）',
  })
  @ApiSuccessResponseCreated(CreateInvitationResponseDto)
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthUserPayload,
  ): Promise<SuccessResponse<CreateInvitationResponseDto>> {
    return successResponse(await this.invitationsService.create(dto, user));
  }

  @Api()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '招待受諾（JWT 未保有）' })
  @ApiSuccessResponse(AuthIssueTokensResponseDto)
  async accept(
    @Body() dto: AcceptInvitationDto,
  ): Promise<SuccessResponse<AuthIssueTokensResponseDto>> {
    return successResponse(await this.invitationsService.accept(dto));
  }
}
