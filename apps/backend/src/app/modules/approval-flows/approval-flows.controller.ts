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
  AuthApi,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
} from '../../decorators';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../decorators/current-user.decorator';
import { Roles } from '../../../decorators/roles.decorator';
import { UserRole } from '../../../models/constants/user-role';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import {
  ApprovalFlowResponseDto,
  ApprovalFlowsListResponseDto,
  CreateApprovalFlowDto,
} from './approval-flows.dto';
import { ApprovalFlowsService } from './approval-flows.service';

@ApiTags('approval-flows')
@Controller('approval-flows')
export class ApprovalFlowsController {
  constructor(private readonly approvalFlows: ApprovalFlowsService) {}

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '承認フロー一覧（tenant_admin）' })
  @ApiSuccessResponse(ApprovalFlowsListResponseDto)
  async list(
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApprovalFlowsListResponseDto>> {
    const rows = await this.approvalFlows.listByTenant(actor.tenantId);
    return successResponse({
      flows: rows.map((r) => this.approvalFlows.toDto(r)),
    });
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '承認フロー作成（tenant_admin）',
    description:
      '参照するフォームテンプレートは published である必要があります。stepOrder は 1 から連番で重複不可。',
  })
  @ApiSuccessResponseCreated(ApprovalFlowResponseDto)
  async create(
    @Body() dto: CreateApprovalFlowDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApprovalFlowResponseDto>> {
    const row = await this.approvalFlows.create(actor.tenantId, dto);
    return successResponse(this.approvalFlows.toDto(row));
  }
}
