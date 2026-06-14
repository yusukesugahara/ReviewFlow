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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  Api,
  AuthApi,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
  RateLimit,
} from '../../../decorators';
import { ApplicantAccessGuard } from '../../../guards/applicant-access.guard';
import { CurrentApplicantSession } from '../../../../decorators/current-applicant-session.decorator';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import type { ApplicantAccessTokenPayload } from '../../auth/services/facades/auth.service';
import type { SuccessResponse } from '../../../type';
import { successResponse } from '../../../utils';
import {
  CreateFormFieldDto,
  CreateFormDefinitionDto,
  FormFieldResponseDto,
  MoveFormFieldDto,
  FormDefinitionResponseDto,
  FormDefinitionsListResponseDto,
  RequestFormAccessDto,
  RequestFormAccessResponseDto,
  UpdateFormDefinitionDescriptionDto,
  UpdateFormFieldSettingsDto,
} from '../dto/form-definitions.dto';
import { FormDefinitionsService } from '../services/facades/form-definitions.service';
import { ApprovalFlowsService } from '../../approval-flows/services/approval-flows.service';
import { ApprovalFlowsListResponseDto } from '../../approval-flows/dto/approval-flows.dto';

@ApiTags('form-definitions')
@Controller('form-definitions')
export class FormDefinitionsController {
  constructor(
    private readonly formDefinitions: FormDefinitionsService,
    private readonly approvalFlows: ApprovalFlowsService,
  ) {}

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義一覧（tenant_admin）' })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description:
      'true の場合は archived のフォーム定義のみ返す。省略時は archived 以外を返す。',
  })
  @ApiSuccessResponse(FormDefinitionsListResponseDto)
  async list(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @Query('includeArchived') includeArchived: string | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionsListResponseDto>> {
    const rows = await this.formDefinitions.listByGroup(
      actor,
      groupId,
      includeArchived === 'true',
    );
    return successResponse({
      definitions: rows.map((t) => this.formDefinitions.toResponse(t)),
    });
  }

  @Api()
  @UseGuards(ApplicantAccessGuard)
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Get('public/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請用の現在フォーム定義取得' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async getCurrentForApplicant(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    const row =
      await this.formDefinitions.getPublishedDefinitionForApplicant(actor);
    return successResponse(this.formDefinitions.toResponse(row));
  }

  @Api()
  @UseGuards(ApplicantAccessGuard)
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
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

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義取得（スペースメンバー）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    const row = await this.formDefinitions.getOneForActor(actor, id);
    return successResponse(this.formDefinitions.toResponse(row));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Patch(':id/description')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義の説明更新' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async updateDescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDefinitionDescriptionDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    const row = await this.formDefinitions.updateDescription(actor, id, dto);
    return successResponse(this.formDefinitions.toResponse(row));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'フォーム定義作成（下書き）' })
  @ApiSuccessResponseCreated(FormDefinitionResponseDto)
  async create(
    @Body() dto: CreateFormDefinitionDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    const saved = await this.formDefinitions.create(actor, dto);
    const full = await this.formDefinitions.getOne(actor.tenantId, saved.id);
    return successResponse(this.formDefinitions.toResponse(full));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'フォーム項目追加（下書きのみ）' })
  @ApiSuccessResponseCreated(FormFieldResponseDto)
  async addField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFormFieldDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormFieldResponseDto>> {
    const field = await this.formDefinitions.addField(actor, id, dto);
    return successResponse(this.formDefinitions.fieldToDto(field));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields/:fieldId/move')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム項目の並び順変更（下書きのみ）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async moveField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: MoveFormFieldDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    await this.formDefinitions.moveField(actor, id, fieldId, dto.direction);
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return successResponse(this.formDefinitions.toResponse(full));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields/:fieldId/delete')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム項目削除（下書きのみ）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async deleteField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    await this.formDefinitions.deleteField(actor, id, fieldId);
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return successResponse(this.formDefinitions.toResponse(full));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Post(':id/fields/:fieldId/settings')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム項目設定更新（下書きのみ）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async updateFieldSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() dto: UpdateFormFieldSettingsDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    await this.formDefinitions.updateFieldSettings(actor, id, fieldId, dto);
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return successResponse(this.formDefinitions.toResponse(full));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/publish')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義公開（draft → published）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    await this.formDefinitions.publish(actor, id);
    const full = await this.formDefinitions.getOneForActor(actor, id);
    return successResponse(this.formDefinitions.toResponse(full));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/archive')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義アーカイブ（削除済みに移動）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    const row = await this.formDefinitions.archive(actor, id);
    return successResponse(this.formDefinitions.toResponse(row));
  }

  @AuthApi()
  @RateLimit({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/restore')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義復元（削除済みから戻す）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    const row = await this.formDefinitions.restore(actor, id);
    return successResponse(this.formDefinitions.toResponse(row));
  }

  @Api()
  @RateLimit({ default: { limit: 10, ttl: 60_000 } })
  @Post('groups/:groupId/request-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム案内メール送信（公開）' })
  @ApiQuery({
    name: 'formDefinitionId',
    required: false,
    description:
      '公開済みフォーム定義ID。同一スペースに公開フォームが複数ある場合は必須。',
  })
  @ApiSuccessResponse(RequestFormAccessResponseDto)
  async requestAccess(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query('formDefinitionId', new ParseUUIDPipe({ optional: true }))
    formDefinitionId: string | undefined,
    @Body() dto: RequestFormAccessDto,
  ): Promise<SuccessResponse<RequestFormAccessResponseDto>> {
    return successResponse(
      await this.formDefinitions.requestAccess(groupId, dto, formDefinitionId),
    );
  }
}
