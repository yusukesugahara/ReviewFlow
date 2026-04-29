import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthApi, ApiSuccessResponse } from '../../decorators';
import {
  CurrentUser,
  type AuthUserPayload,
} from '../../../decorators/current-user.decorator';
import { Roles } from '../../../decorators/roles.decorator';
import { UserRole } from '../../../models/constants/user-role';
import type { SuccessResponse } from '../../type';
import { successResponse } from '../../utils';
import {
  TenantUserSummaryDto,
  TenantUsersListResponseDto,
  UpdateUserRoleDto,
} from './users.dto';
import { UsersService } from './users.service';

function toSummary(u: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}): TenantUserSummaryDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @AuthApi()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'テナント内ユーザー一覧（system admin）' })
  @ApiSuccessResponse(TenantUsersListResponseDto)
  async list(
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<TenantUsersListResponseDto>> {
    const rows = await this.usersService.findAllByTenant(actor.tenantId);
    return successResponse({
      users: rows.map(toSummary),
    });
  }

  @AuthApi()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Patch(':id/role')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'テナント内ユーザーのロール変更（system admin）' })
  @ApiSuccessResponse(TenantUserSummaryDto)
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthUserPayload,
  ): Promise<SuccessResponse<TenantUserSummaryDto>> {
    const updated = await this.usersService.updateRoleInTenant(
      actor.tenantId,
      id,
      dto.role,
      actor.id,
    );
    return successResponse(toSummary(updated));
  }
}
