import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
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

  @ApiPropertyOptional({
    description:
      'action_type / target_type / target_id / actor_user_id / group_id の部分一致検索',
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
  actionType!: string;

  @ApiProperty()
  targetType!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  targetId!: string | null;

  @ApiPropertyOptional()
  metadataJson!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

export class AuditLogsListResponseDto {
  @ApiProperty({ type: [AuditLogItemDto] })
  logs!: AuditLogItemDto[];
}
