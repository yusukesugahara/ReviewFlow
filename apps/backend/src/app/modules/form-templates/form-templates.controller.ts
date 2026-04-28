import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  Api,
  AuthApi,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
} from '../../decorators';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { CurrentApplicantSession } from '../../../decorators/current-applicant-session.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../decorators/current-user.decorator';
import { Roles } from '../../../decorators/roles.decorator';
import { UserRole } from '../../../models/constants/user-role';
import type { ApplicantAccessTokenPayload } from '../auth/auth.service';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import {
  CreateFormFieldDto,
  CreateFormTemplateDto,
  FormFieldResponseDto,
  MoveFormFieldDto,
  FormTemplateResponseDto,
  FormTemplatesListResponseDto,
  RequestFormAccessDto,
  RequestFormAccessResponseDto,
  UpdateFormFieldSettingsDto,
} from './form-templates.dto';
import { FormTemplatesService } from './form-templates.service';
import { ApprovalFlowsService } from '../approval-flows/approval-flows.service';
import { ApprovalFlowsListResponseDto } from '../approval-flows/approval-flows.dto';

@ApiTags('form-templates')
@Controller('form-templates')
export class FormTemplatesController {
  constructor(
    private readonly formTemplates: FormTemplatesService,
    private readonly approvalFlows: ApprovalFlowsService,
  ) {}

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォームテンプレート一覧（tenant_admin）' })
  @ApiSuccessResponse(FormTemplatesListResponseDto)
  async list(
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormTemplatesListResponseDto>> {
    const rows = await this.formTemplates.listByTenant(actor.tenantId);
    return successResponse({
      templates: rows.map((t) => this.formTemplates.toResponse(t)),
    });
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォームテンプレート取得（tenant_admin）' })
  @ApiSuccessResponse(FormTemplateResponseDto)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormTemplateResponseDto>> {
    const row = await this.formTemplates.getOne(actor.tenantId, id);
    return successResponse(this.formTemplates.toResponse(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'フォームテンプレート作成（下書き）' })
  @ApiSuccessResponseCreated(FormTemplateResponseDto)
  async create(
    @Body() dto: CreateFormTemplateDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormTemplateResponseDto>> {
    const saved = await this.formTemplates.create(
      actor.tenantId,
      dto,
      actor.id,
    );
    const full = await this.formTemplates.getOne(actor.tenantId, saved.id);
    return successResponse(this.formTemplates.toResponse(full));
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'フォーム項目追加（下書きのみ）' })
  @ApiSuccessResponseCreated(FormFieldResponseDto)
  async addField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFormFieldDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormFieldResponseDto>> {
    const field = await this.formTemplates.addField(actor.tenantId, id, dto);
    return successResponse(this.formTemplates.fieldToDto(field));
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields/:fieldId/move')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム項目の並び順変更（下書きのみ）' })
  @ApiSuccessResponse(FormTemplateResponseDto)
  async moveField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: MoveFormFieldDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormTemplateResponseDto>> {
    await this.formTemplates.moveField(
      actor.tenantId,
      id,
      fieldId,
      dto.direction,
    );
    const full = await this.formTemplates.getOne(actor.tenantId, id);
    return successResponse(this.formTemplates.toResponse(full));
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields/:fieldId/delete')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム項目削除（下書きのみ）' })
  @ApiSuccessResponse(FormTemplateResponseDto)
  async deleteField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormTemplateResponseDto>> {
    await this.formTemplates.deleteField(actor.tenantId, id, fieldId);
    const full = await this.formTemplates.getOne(actor.tenantId, id);
    return successResponse(this.formTemplates.toResponse(full));
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields/:fieldId/settings')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム項目設定更新（下書きのみ）' })
  @ApiSuccessResponse(FormTemplateResponseDto)
  async updateFieldSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: UpdateFormFieldSettingsDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormTemplateResponseDto>> {
    await this.formTemplates.updateFieldSettings(
      actor.tenantId,
      id,
      fieldId,
      dto,
    );
    const full = await this.formTemplates.getOne(actor.tenantId, id);
    return successResponse(this.formTemplates.toResponse(full));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/publish')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォームテンプレート公開（draft → published）' })
  @ApiSuccessResponse(FormTemplateResponseDto)
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormTemplateResponseDto>> {
    await this.formTemplates.publish(actor.tenantId, id);
    const full = await this.formTemplates.getOne(actor.tenantId, id);
    return successResponse(this.formTemplates.toResponse(full));
  }

  @Api()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/request-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム案内メール送信（公開）' })
  @ApiSuccessResponse(RequestFormAccessResponseDto)
  async requestAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestFormAccessDto,
  ): Promise<SuccessResponse<RequestFormAccessResponseDto>> {
    return successResponse(await this.formTemplates.requestAccess(id, dto));
  }

  @Api()
  @UseGuards(ApplicantAccessGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get('public/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請用の現在テンプレート取得' })
  @ApiSuccessResponse(FormTemplateResponseDto)
  async getCurrentForApplicant(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ): Promise<SuccessResponse<FormTemplateResponseDto>> {
    const row =
      await this.formTemplates.getPublishedTemplateForApplicant(actor);
    return successResponse(this.formTemplates.toResponse(row));
  }

  @Api()
  @UseGuards(ApplicantAccessGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get('public/current/approval-flows')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請用の有効な承認フロー一覧' })
  @ApiSuccessResponse(ApprovalFlowsListResponseDto)
  async listCurrentFlowsForApplicant(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ): Promise<SuccessResponse<ApprovalFlowsListResponseDto>> {
    const rows = await this.approvalFlows.listActiveForApplicant(actor);
    return successResponse({
      flows: rows.map((row) => this.approvalFlows.toDto(row)),
    });
  }
}
