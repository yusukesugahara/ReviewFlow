import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { INVITATION_ASSIGNABLE_ROLES } from '../../../models/constants/invitation-role';

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
    example: 'approver',
    enum: INVITATION_ASSIGNABLE_ROLES,
  })
  @IsString()
  @IsIn(INVITATION_ASSIGNABLE_ROLES)
  role!: (typeof INVITATION_ASSIGNABLE_ROLES)[number];
}
