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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthApi,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
} from '../../../decorators';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import type { SuccessResponse } from '../../../type';
import { successResponse } from '../../../utils';
import {
  ApproveApplicationDto,
  ApplicationCreateResponseDto,
  ApplicationDetailDto,
  ApplicationsListResponseDto,
  CorrectionsListResponseDto,
  CorrectionTargetsResponseDto,
  CreateApplicationDto,
  PatchApplicationDto,
  RejectApplicationDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';
import { ApplicationsService } from '../services/applications.service';

@ApiTags('applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '申請一覧（ロールに応じたスコープ）' })
  @ApiSuccessResponse(ApplicationsListResponseDto)
  async list(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationsListResponseDto>> {
    const rows = await this.applications.listForActor(actor, groupId);
    return successResponse({
      applications: rows.map((r) => this.applications.toSummary(r)),
    });
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
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
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
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
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/approve')
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '承認（in_review の現在ステップ）' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveApplicationDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.approve(actor, id, dto);
    return successResponse(this.applications.toDetail(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/return')
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '差し戻し',
    description:
      '現在ステップの can_return が true のときのみ。correction_request を作成。',
  })
  @ApiSuccessResponse(ApplicationDetailDto)
  async returnWithCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnApplicationDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.returnApplication(actor, id, dto);
    return successResponse(this.applications.toDetail(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(':id/return-email/resend')
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '差し戻しメール再送',
    description:
      'returned かつ open correction がある申請の申請者向け修正URLを再送する。',
  })
  @ApiSuccessResponse(ApplicationDetailDto)
  async resendReturnEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.resendReturnEmail(actor, id);
    return successResponse(this.applications.toDetail(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/reject')
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '却下' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.reject(actor, id, dto);
    return successResponse(this.applications.toDetail(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/resubmit')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '再提出（returned → in_review）' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.resubmit(actor, id);
    return successResponse(this.applications.toDetail(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id/correction-targets')
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '修正対象取得（オープンな correction + 現在値）',
    description:
      'returned 時の入力支援用。最新の status=open の correction_request を1件分まとめて返す（無ければ openCorrection は null）。',
  })
  @ApiSuccessResponse(CorrectionTargetsResponseDto)
  async getCorrectionTargets(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<CorrectionTargetsResponseDto>> {
    const data = await this.applications.getCorrectionTargetsForActor(
      actor,
      id,
    );
    return successResponse(data);
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id/corrections')
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '差し戻し履歴（correction_requests）',
    description: 'テナント内の当該申請に紐づく correction を新しい順で一覧。',
  })
  @ApiSuccessResponse(CorrectionsListResponseDto)
  async listCorrections(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<CorrectionsListResponseDto>> {
    const data = await this.applications.getCorrectionsForActor(actor, id);
    return successResponse(data);
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  @Roles(UserRole.TENANT_USER, UserRole.TENANT_ADMIN)
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
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '値更新',
    description:
      'draft / published は全項目。returned はオープンな correction の対象フィールドのみ。',
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
