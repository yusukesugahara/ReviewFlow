import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { ApplicationStatusValue } from '../../../models/constants/application-status';

export class CreateApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

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
    description:
      'field_key をキーにした値。draft は全項目可。returned はオープンな correction の対象フィールドのみ。',
  })
  @IsObject()
  values!: Record<string, unknown>;
}

export class ApproveApplicationDto {
  @ApiPropertyOptional({ description: '任意コメント（監査用）' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;
}

export class RejectApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;
}

export class ReturnFieldItemDto {
  @ApiProperty({ format: 'uuid', description: 'form_fields.id' })
  @IsUUID()
  fieldId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;
}

export class ReturnApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  overallComment?: string;

  @ApiProperty({ type: [ReturnFieldItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnFieldItemDto)
  fields!: ReturnFieldItemDto[];
}

export class CorrectionRequestItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  formFieldId!: string;

  @ApiProperty()
  fieldKey!: string;

  @ApiPropertyOptional({ nullable: true })
  comment!: string | null;

  @ApiProperty()
  isResolved!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class CorrectionRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  overallComment!: string | null;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: [CorrectionRequestItemResponseDto] })
  items!: CorrectionRequestItemResponseDto[];
}

export class CorrectionsListResponseDto {
  @ApiProperty({ type: [CorrectionRequestResponseDto] })
  corrections!: CorrectionRequestResponseDto[];
}

/** 修正フォーム用: オープンな correction と対象フィールド＋現在値 */
export class CorrectionTargetItemResponseDto {
  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  formFieldId!: string;

  @ApiProperty()
  fieldKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  fieldType!: string;

  @ApiProperty()
  required!: boolean;

  @ApiPropertyOptional({ nullable: true })
  comment!: string | null;

  @ApiPropertyOptional({
    description: 'application_field_values.value_json に相当',
  })
  currentValue!: unknown;
}

export class OpenCorrectionTargetsDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  overallComment!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: [CorrectionTargetItemResponseDto] })
  items!: CorrectionTargetItemResponseDto[];
}

export class CorrectionTargetsResponseDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  applicationStatus!: string;

  @ApiPropertyOptional({
    type: OpenCorrectionTargetsDto,
    nullable: true,
    description: 'オープンな correction が無いとき null',
  })
  openCorrection!: OpenCorrectionTargetsDto | null;
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
  groupId!: string;

  @ApiProperty()
  status!: ApplicationStatusValue;

  @ApiProperty()
  formTemplateId!: string;

  @ApiProperty()
  approvalFlowId!: string;

  @ApiProperty()
  applicantEmail!: string;

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
