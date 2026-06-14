import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthApi, ApiSuccessResponse, RateLimit } from '../../../decorators';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../../decorators/current-user.decorator';
import { Roles } from '../../../../decorators/roles.decorator';
import { UserRole } from '../../../../models/constants/user-role';
import type { SuccessResponse } from '../../../type';
import { successResponse } from '../../../utils';
import {
  AuditLogsListResponseDto,
  AuditLogsQueryDto,
} from '../dto/audit-logs.dto';
import { AuditLogsService } from '../services/audit-logs.service';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @AuthApi()
  @RateLimit({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '監査ログ一覧（tenant_admin）' })
  @ApiSuccessResponse(AuditLogsListResponseDto)
  async list(
    @CurrentUser() actor: AuthUserPayload,
    @Query() query: AuditLogsQueryDto,
  ): Promise<SuccessResponse<AuditLogsListResponseDto>> {
    return successResponse(
      await this.auditLogs.listByTenant(actor.tenantId, query),
    );
  }
}
