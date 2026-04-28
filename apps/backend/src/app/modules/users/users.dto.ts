import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import {
  UserRole,
  type UserRoleValue,
} from '../../../models/constants/user-role';

const USER_ROLE_UPDATE_SELECTABLE_ROLES: UserRoleValue[] = [
  UserRole.PLATFORM_ADMIN,
  UserRole.APPLICANT,
];

export class TenantUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class TenantUsersListResponseDto {
  @ApiProperty({ type: [TenantUserSummaryDto] })
  users!: TenantUserSummaryDto[];
}

export class UpdateUserRoleDto {
  @ApiProperty({
    example: UserRole.PLATFORM_ADMIN,
    enum: USER_ROLE_UPDATE_SELECTABLE_ROLES,
  })
  @IsString()
  @IsIn(USER_ROLE_UPDATE_SELECTABLE_ROLES)
  role!: UserRoleValue;
}
