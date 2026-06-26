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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  Api,
  ApiSuccessResponse,
  ApiSuccessResponseCreated,
  RateLimit,
} from '../../../decorators';
import { ApplicantAccessGuard } from '../../../guards/applicant-access.guard';
import { CurrentApplicantSession } from '../../../../decorators/current-applicant-session.decorator';
import type { ApplicantAccessTokenPayload } from '../../auth/services/facades/auth.service';
import type { SuccessResponse } from '../../../type';
import { successResponse } from '../../../utils';
import {
  ApplicationDetailDto,
  CorrectionTargetsResponseDto,
  CreatePublicApplicationDto,
  PatchApplicationDto,
  ResubmitApplicationDto,
} from '../dto/applications.dto';
import { ApplicationsService } from '../services/facades/applications.service';

@ApiTags('public-applications')
@Controller('public/applications')
@Api()
@UseGuards(ApplicantAccessGuard)
export class PublicApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @RateLimit({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '公開申請フォーム送信' })
  @ApiSuccessResponseCreated(ApplicationDetailDto)
  async create(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Body() dto: CreatePublicApplicationDto,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.createAndSubmitForApplicant(actor, dto);
    return successResponse(this.applications.toDetailForApplicant(row, actor));
  }

  @RateLimit({ default: { limit: 60, ttl: 60_000 } })
  @Get('current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '申請者向け申請詳細取得',
    description: 'applicant access token に紐づく申請内容を返す。',
  })
  @ApiSuccessResponse(ApplicationDetailDto)
  async getCurrent(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.getCurrentForApplicant(actor);
    return successResponse(this.applications.toDetailForApplicant(row, actor));
  }

  @RateLimit({ default: { limit: 60, ttl: 60_000 } })
  @Get('returned/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '申請者向け差し戻し修正対象取得',
    description:
      '差し戻しメールの applicant access token に紐づく申請の open correction を返す。',
  })
  async getReturnedCurrent(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
  ): Promise<SuccessResponse<CorrectionTargetsResponseDto>> {
    return successResponse(
      await this.applications.getReturnedCorrectionForApplicant(actor),
    );
  }

  @RateLimit({ default: { limit: 30, ttl: 60_000 } })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: '申請者向け差し戻し項目更新',
    description:
      'returned かつ open correction がある申請のフォーム項目を更新できる。',
  })
  async patchReturned(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchApplicationDto,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.patchReturnedForApplicant(
      actor,
      id,
      dto,
    );
    return successResponse(this.applications.toDetailForApplicant(row, actor));
  }

  @RateLimit({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/resubmit')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: '申請者向け再提出' })
  async resubmitReturned(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResubmitApplicationDto,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.resubmitForApplicant(actor, id, dto);
    return successResponse(this.applications.toDetailForApplicant(row, actor));
  }
}
