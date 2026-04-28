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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  Api,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
} from '../../decorators';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { CurrentApplicantSession } from '../../../decorators/current-applicant-session.decorator';
import type { ApplicantAccessTokenPayload } from '../auth/auth.service';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import {
  ApplicationCreateResponseDto,
  ApplicationDetailDto,
  ApplicationsListResponseDto,
  CorrectionsListResponseDto,
  CorrectionTargetsResponseDto,
  CreateApplicationDto,
  PatchApplicationDto,
} from './applications.dto';
import { ApplicationsService } from './applications.service';

class ApplicantSessionResponseDto {
  email!: string;
  tenantId!: string;
  templateId!: string;
}

@ApiTags('public-applications')
@Controller('public/applications')
@Api()
@UseGuards(ApplicantAccessGuard)
export class PublicApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請セッション情報' })
  @ApiSuccessResponse(ApplicantSessionResponseDto)
  session(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ): SuccessResponse<ApplicantSessionResponseDto> {
    return successResponse({
      email: actor.email,
      tenantId: actor.tenantId,
      templateId: actor.templateId,
    });
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請一覧' })
  @ApiSuccessResponse(ApplicationsListResponseDto)
  async list(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ): Promise<SuccessResponse<ApplicationsListResponseDto>> {
    const rows = await this.applications.listForApplicant(actor);
    return successResponse({
      applications: rows.map((row) => this.applications.toSummary(row)),
    });
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '公開申請作成（下書き）' })
  @ApiSuccessResponseCreated(ApplicationCreateResponseDto)
  async create(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Body() dto: CreateApplicationDto,
  ): Promise<SuccessResponse<ApplicationCreateResponseDto>> {
    const row = await this.applications.createForApplicant(actor, dto);
    return successResponse({ id: row.id, status: row.status });
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請詳細' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async getOne(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.getOneForApplicant(actor, id);
    return successResponse(this.applications.toDetail(row));
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請更新' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async patch(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchApplicationDto,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.patchForApplicant(actor, id, dto);
    return successResponse(this.applications.toDetail(row));
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請提出' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async submit(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.submitForApplicant(actor, id);
    return successResponse(this.applications.toDetail(row));
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/resubmit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請再提出' })
  @ApiSuccessResponse(ApplicationDetailDto)
  async resubmit(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.resubmitForApplicant(actor, id);
    return successResponse(this.applications.toDetail(row));
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id/correction-targets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請の修正対象取得' })
  @ApiSuccessResponse(CorrectionTargetsResponseDto)
  async correctionTargets(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<CorrectionTargetsResponseDto>> {
    const data = await this.applications.getCorrectionTargetsForApplicant(
      actor,
      id,
    );
    return successResponse(data);
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(':id/corrections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '公開申請の差し戻し履歴' })
  @ApiSuccessResponse(CorrectionsListResponseDto)
  async corrections(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<CorrectionsListResponseDto>> {
    const data = await this.applications.getCorrectionsForApplicant(actor, id);
    return successResponse(data);
  }
}
