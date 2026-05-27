import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  ApplicationStatus,
  type ApplicationStatusValue,
} from '../../../models/constants/application-status';
import type { ExportJobStatusValue } from '../../../models/constants/export-job-status';

export class CreateExportJobDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiPropertyOptional({ enum: Object.values(ApplicationStatus) })
  @IsOptional()
  @IsIn(Object.values(ApplicationStatus))
  status?: ApplicationStatusValue;
}

export class ExportJobResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  status!: ExportJobStatusValue;

  @ApiPropertyOptional()
  filterJson!: Record<string, unknown> | null;

  @ApiPropertyOptional()
  filePath!: string | null;

  @ApiPropertyOptional({ nullable: true })
  startedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
