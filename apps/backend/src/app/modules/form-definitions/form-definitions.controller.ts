import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  Api,
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
  CreateFormFieldDto,
  CreateFormDefinitionDto,
  FormFieldResponseDto,
  MoveFormFieldDto,
  FormDefinitionResponseDto,
  FormDefinitionsListResponseDto,
  RequestFormAccessDto,
  RequestFormAccessResponseDto,
  UpdateFormFieldSettingsDto,
} from './form-definitions.dto';
import { FormDefinitionsService } from './form-definitions.service';

@ApiTags('form-definitions')
@Controller('form-definitions')
export class FormDefinitionsController {
  constructor(private readonly formDefinitions: FormDefinitionsService) {}

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義一覧（tenant_admin）' })
  @ApiSuccessResponse(FormDefinitionsListResponseDto)
  async list(
    @Query('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionsListResponseDto>> {
    const rows = await this.formDefinitions.listByGroup(actor, groupId);
    return successResponse({
      definitions: rows.map((t) => this.formDefinitions.toResponse(t)),
    });
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'フォーム定義取得（tenant_admin）' })
  @ApiSuccessResponse(FormDefinitionResponseDto)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<FormDefinitionResponseDto>> {
    const row = await this.formDefinitions.getOneForActor(actor, id);
    return successResponse(this.formDefinitions.toResponse(row));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
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

  @Api()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
    @Query('formDefinitionId') formDefinitionId: string | undefined,
    @Body() dto: RequestFormAccessDto,
  ): Promise<SuccessResponse<RequestFormAccessResponseDto>> {
    return successResponse(
      await this.formDefinitions.requestAccess(groupId, dto, formDefinitionId),
    );
  }
}
