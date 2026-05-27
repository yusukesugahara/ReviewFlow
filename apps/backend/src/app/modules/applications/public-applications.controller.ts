import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Api, ApiSuccessResponseCreated } from '../../decorators';
import { ApplicantAccessGuard } from '../../guards/applicant-access.guard';
import { CurrentApplicantSession } from '../../../decorators/current-applicant-session.decorator';
import type { ApplicantAccessTokenPayload } from '../auth/auth.service';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import {
  ApplicationDetailDto,
  CreatePublicApplicationDto,
} from './applications.dto';
import { ApplicationsService } from './applications.service';

@ApiTags('public-applications')
@Controller('public/applications')
@Api()
@UseGuards(ApplicantAccessGuard)
export class PublicApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '公開申請フォーム送信' })
  @ApiSuccessResponseCreated(ApplicationDetailDto)
  async create(
    @CurrentApplicantSession() actor: ApplicantAccessTokenPayload,
    @Body() dto: CreatePublicApplicationDto,
  ): Promise<SuccessResponse<ApplicationDetailDto>> {
    const row = await this.applications.createAndSubmitForApplicant(actor, dto);
    return successResponse(this.applications.toDetail(row));
  }
}
