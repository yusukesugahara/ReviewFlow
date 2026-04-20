import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
}

export class AuditLogItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  actorUserId!: string | null;

  @ApiProperty()
  actionType!: string;

  @ApiProperty()
  targetType!: string;

  @ApiPropertyOptional({ nullable: true })
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
