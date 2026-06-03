import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  GROUP_MEMBER_ROLES,
  GroupMemberRole,
} from '../../../models/constants/group-member-role';

export class CreateGroupDto {
  @ApiProperty({ example: '経理部', description: 'スペース名' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: '経理部向けの承認・レビュースペース' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: '初期スペース管理者。1人以上必須。',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  adminUserIds!: string[];
}

export class AddGroupMemberDto {
  @ApiProperty({ description: 'スペースに追加するテナント内ユーザーID' })
  @IsUUID('4')
  userId!: string;

  @ApiProperty({ example: GroupMemberRole.USER, enum: GROUP_MEMBER_ROLES })
  @IsString()
  @IsIn(GROUP_MEMBER_ROLES)
  role!: (typeof GROUP_MEMBER_ROLES)[number];
}

export class UpdateGroupMemberRoleDto {
  @ApiProperty({ example: GroupMemberRole.ADMIN, enum: GROUP_MEMBER_ROLES })
  @IsString()
  @IsIn(GROUP_MEMBER_ROLES)
  role!: (typeof GROUP_MEMBER_ROLES)[number];
}

export class GroupSummaryDto {
  @ApiProperty({ description: 'スペースID。API では groupId として参照する。' })
  id!: string;

  @ApiProperty({ description: 'スペース名' })
  name!: string;

  @ApiProperty({
    description: 'スペース説明',
    type: String,
    nullable: true,
  })
  description!: string | null;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({
    description:
      'ログインユーザーのこのスペースでのロール。未参加の tenant_admin は null。',
    enum: GROUP_MEMBER_ROLES,
    nullable: true,
  })
  currentUserRole!: string | null;
}

export class GroupsListResponseDto {
  @ApiProperty({
    description: 'スペース一覧。後方互換のためレスポンスキーは groups。',
    type: [GroupSummaryDto],
  })
  groups!: GroupSummaryDto[];
}

export class GroupMemberSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    description: '所属スペースID。後方互換のためプロパティ名は groupId。',
  })
  groupId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string | null;

  @ApiProperty({
    description: 'スペース内ロール',
    enum: GROUP_MEMBER_ROLES,
  })
  role!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class GroupMembersListResponseDto {
  @ApiProperty({ type: [GroupMemberSummaryDto] })
  members!: GroupMemberSummaryDto[];
}

export class GroupAvailableUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string | null;
}

export class GroupAvailableUsersResponseDto {
  @ApiProperty({ type: [GroupAvailableUserSummaryDto] })
  users!: GroupAvailableUserSummaryDto[];
}
