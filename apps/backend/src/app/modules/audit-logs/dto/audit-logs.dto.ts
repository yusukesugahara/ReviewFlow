import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AuditLogsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: 'action_type で前方一致絞り込み' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  actionType?: string;

  @ApiPropertyOptional({ description: 'target_type の完全一致絞り込み' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetType?: string;

  @ApiPropertyOptional({ description: 'application_id の完全一致絞り込み' })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({ description: 'target_user_id の完全一致絞り込み' })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @ApiPropertyOptional({
    description:
      'action_type / summary / actor / target / application / group の部分一致検索',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  q?: string;

  @ApiPropertyOptional({
    description: 'created_at の検索開始日時（ISO 8601）',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'created_at の検索終了日時（ISO 8601）',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}

export class AuditLogItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  groupId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  actorUserId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  actorEmail!: string | null;

  @ApiProperty()
  actorType!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  actorEmailSnapshot!: string | null;

  @ApiProperty()
  actionType!: string;

  @ApiProperty()
  targetType!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  targetId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  targetUserId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  targetEmailSnapshot!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  applicationId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  statusFrom!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  statusTo!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  stepOrderFrom!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  stepOrderTo!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  roleFrom!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  roleTo!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  groupRoleFrom!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  groupRoleTo!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  summary!: string | null;

  @ApiPropertyOptional()
  metadataJson!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

export class AuditLogsListResponseDto {
  @ApiProperty({ type: [AuditLogItemDto] })
  logs!: AuditLogItemDto[];
}
