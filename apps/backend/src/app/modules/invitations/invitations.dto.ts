import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  GROUP_MEMBER_ROLES,
  GroupMemberRole,
} from '../../../models/constants/group-member-role';
import { INVITATION_ASSIGNABLE_ROLES } from '../../../models/constants/invitation-role';

export class CreateInvitationDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'tenant_user',
    enum: INVITATION_ASSIGNABLE_ROLES,
  })
  @IsString()
  @IsIn(INVITATION_ASSIGNABLE_ROLES)
  role!: (typeof INVITATION_ASSIGNABLE_ROLES)[number];

  @ApiPropertyOptional({ description: '招待受諾時に参加させるスペースID' })
  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @ApiPropertyOptional({
    example: GroupMemberRole.USER,
    enum: GROUP_MEMBER_ROLES,
    description: 'スペース参加時のロール',
  })
  @IsOptional()
  @IsString()
  @IsIn(GROUP_MEMBER_ROLES)
  groupRole?: (typeof GROUP_MEMBER_ROLES)[number];
}

export class CreateInvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  groupId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  groupRole?: string | null;

  @ApiProperty({ description: 'ISO 8601' })
  expiresAt!: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ description: '招待作成時に発行された token' })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @ApiPropertyOptional({ example: '山田 太郎' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'password12', minLength: 8, maxLength: 72 })
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
