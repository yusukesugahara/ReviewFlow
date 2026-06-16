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
} from '../../../../models/constants/group-member-role';

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

export class UpdateGroupDto {
  @ApiProperty({ example: '経理部', description: 'スペース名' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: '経理部向けの承認・レビュースペース' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class AddGroupMemberDto {
  @ApiProperty({ description: 'スペースに追加するテナント内ユーザID' })
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
      'ログインユーザのこのスペースでのロール。未参加の tenant_admin は null。',
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

export class SpaceDashboardSummaryDto {
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

  @ApiPropertyOptional({
    description:
      'ログインユーザのこのスペースでのロール。未参加の tenant_admin は null。',
    enum: GROUP_MEMBER_ROLES,
    nullable: true,
  })
  currentUserRole!: string | null;

  @ApiProperty({ description: 'スペースメンバー数' })
  memberCount!: number;

  @ApiProperty({ description: 'アーカイブ済みを除くフォーム定義数' })
  formCount!: number;

  @ApiProperty({ description: '公開中フォーム定義数' })
  publishedFormCount!: number;

  @ApiProperty({ description: '閲覧可能な申請数' })
  totalApplications!: number;

  @ApiProperty({ description: '対応が必要な申請数' })
  needsActionCount!: number;

  @ApiProperty({ description: '差し戻し中の申請数' })
  returnedCount!: number;

  @ApiProperty({ description: '承認済み申請数' })
  approvedCount!: number;

  @ApiProperty({ description: '却下済み申請数' })
  rejectedCount!: number;

  @ApiProperty({ description: '差し戻し履歴数' })
  correctionCount!: number;

  @ApiProperty({ description: '差し戻し後に再提出されレビュー中の申請数' })
  resubmitCount!: number;

  @ApiProperty({ description: '申請あたりの平均差し戻し回数' })
  avgReturns!: string;

  @ApiProperty({
    description: '直近申請更新日時',
    type: String,
    nullable: true,
  })
  latestApplicationAt!: string | null;
}

export class SpaceDashboardResponseDto {
  @ApiProperty({
    description: 'スペースダッシュボード集計一覧',
    type: [SpaceDashboardSummaryDto],
  })
  spaces!: SpaceDashboardSummaryDto[];
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
