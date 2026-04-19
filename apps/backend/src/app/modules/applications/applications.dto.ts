import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import type { ApplicationStatusValue } from '../../../models/constants/application-status';

export class CreateApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  formTemplateId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      '公開テンプレートに有効な承認フローが複数あるときは必須。1件のみなら省略可。',
  })
  @IsOptional()
  @IsUUID()
  approvalFlowId?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { expense_title: '出張交通費', amount: 12000 },
  })
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;
}

export class PatchApplicationDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'field_key をキーにした値（draft のみ）',
  })
  @IsObject()
  values!: Record<string, unknown>;
}

export class ApplicationCreateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: ApplicationStatusValue;
}

export class ApplicationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: ApplicationStatusValue;

  @ApiProperty()
  formTemplateId!: string;

  @ApiProperty()
  approvalFlowId!: string;

  @ApiProperty()
  applicantUserId!: string;

  @ApiPropertyOptional({ nullable: true })
  currentStepOrder!: number | null;

  @ApiPropertyOptional({ nullable: true })
  submittedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ApplicationDetailDto extends ApplicationSummaryDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'field_key → 値',
  })
  values!: Record<string, unknown>;
}

export class ApplicationsListResponseDto {
  @ApiProperty({ type: [ApplicationSummaryDto] })
  applications!: ApplicationSummaryDto[];
}
