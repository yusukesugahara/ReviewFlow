import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
  AuthApi,
} from '../../decorators';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../decorators/current-user.decorator';
import { Roles } from '../../../decorators/roles.decorator';
import { UserRole } from '../../../models/constants/user-role';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import { CreateExportJobDto, ExportJobResponseDto } from './export-jobs.dto';
import { ExportJobsService } from './export-jobs.service';

@ApiTags('export-jobs')
@Controller('export-jobs')
export class ExportJobsController {
  constructor(private readonly exportJobs: ExportJobsService) {}

  @AuthApi()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'CSV 出力ジョブ作成（tenant_admin）' })
  @ApiSuccessResponseCreated(ExportJobResponseDto)
  async create(
    @Body() dto: CreateExportJobDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ExportJobResponseDto>> {
    const row = await this.exportJobs.create(actor, dto);
    return successResponse(row);
  }

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CSV 出力ジョブ状態取得' })
  @ApiSuccessResponse(ExportJobResponseDto)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<ExportJobResponseDto>> {
    return successResponse(await this.exportJobs.getOne(actor, id));
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':id/download')
  @Roles(UserRole.TENANT_ADMIN, UserRole.TENANT_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'CSV ダウンロード（completed のみ）' })
  @ApiProduces('text/csv')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<StreamableFile> {
    const file = await this.exportJobs.getDownload(actor, id);
    return new StreamableFile(file.content, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }
}
