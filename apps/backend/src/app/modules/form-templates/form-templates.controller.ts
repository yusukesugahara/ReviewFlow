import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  CreateFormFieldDto,
  CreateFormTemplateDto,
  FormFieldResponseDto,
  FormTemplateResponseDto,
  FormTemplatesListResponseDto,
} from './form-templates.dto';
import { FormTemplatesService } from './form-templates.service';

@ApiTags('form-templates')
@Controller('form-templates')
export class FormTemplatesController {
  constructor(private readonly formTemplates: FormTemplatesService) {}

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
}
