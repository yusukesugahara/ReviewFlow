import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApplicationCreateResponseDto,
  ApplicationDetailDto,
  ApplicationsListResponseDto,
  CreateApplicationDto,
  PatchApplicationDto,
} from './applications.dto';
import { ApplicationsService } from './applications.service';

@ApiTags('applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.APPLICANT, UserRole.APPROVER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '申請一覧（ロールに応じたスコープ）' })
  @ApiSuccessResponse(ApplicationsListResponseDto)
  async list(
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationsListResponseDto>> {
    const rows = await this.applications.listForActor(actor);
    return successResponse({
      applications: rows.map((r) => this.applications.toSummary(r)),
    });
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @Roles(UserRole.APPLICANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '申請作成（下書き）',
    description:
      '公開済みフォームのみ。有効な承認フローが複数ある場合は approvalFlowId を指定。',
  })
  @ApiSuccessResponseCreated(ApplicationCreateResponseDto)
  async create(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationCreateResponseDto>> {
    const row = await this.applications.create(actor, dto);
    return successResponse({ id: row.id, status: row.status });
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/submit')
  @Roles(UserRole.APPLICANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '提出（draft → in_review）' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.submit(actor, id);
    return successResponse(this.applications.toDetail(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  @Roles(UserRole.APPLICANT, UserRole.APPROVER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '申請詳細（field_key → 値）' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.getOneForActor(actor, id);
    return successResponse(this.applications.toDetail(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Patch(':id')
  @Roles(UserRole.APPLICANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '下書きの値更新',
    description: 'status が draft のときのみ（returned の項目制限は別フェーズ）。',
  })
  @ApiSuccessResponse(ApplicationDetailDto)
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchApplicationDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.patch(actor, id, dto);
    return successResponse(this.applications.toDetail(row));
  }
}
