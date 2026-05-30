import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ApplicationStatus,
  type ApplicationStatusValue,
} from '../../../models/constants/application-status';

export class CreateApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      '利用する公開済みフォーム定義。スペースに公開済みフォームが複数あるときは必須。',
  })
  @IsOptional()
  @IsUUID()
  formDefinitionId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'スペースに有効な承認フローが複数あるときは必須。1件のみなら省略可。',
  })
  @IsOptional()
  @IsUUID()
  approvalFlowId?: string;

  @ApiPropertyOptional({
    enum: [ApplicationStatus.DRAFT, ApplicationStatus.PUBLISHED],
    description:
      '作成直後の申請ステータス。省略時は draft。申請作成画面で公開したフォームは published を指定する。',
  })
  @IsOptional()
  @IsIn([ApplicationStatus.DRAFT, ApplicationStatus.PUBLISHED])
  status?: typeof ApplicationStatus.DRAFT | typeof ApplicationStatus.PUBLISHED;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { expense_title: '出張交通費', amount: 12000 },
  })
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;
}

export class CreatePublicApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      '利用する公開済みフォーム定義。申請者アクセストークンにフォーム定義が含まれる場合はそちらを優先する。',
  })
  @IsOptional()
  @IsUUID()
  formDefinitionId?: string;

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
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      '差し替える公開済みフォーム定義。draft / published の申請でのみ指定可能。',
  })
  @IsOptional()
  @IsUUID()
  formDefinitionId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      '差し替える有効な承認フロー。draft / published の申請でのみ指定可能。',
  })
  @IsOptional()
  @IsUUID()
  approvalFlowId?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'field_key をキーにした値。draft は全項目可。returned はオープンな correction の対象フィールドのみ。',
  })
  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;
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
  approvalFlowId!: string;

  @ApiProperty()
  formDefinitionId!: string;

  @ApiProperty()
  formDefinitionName!: string;

  @ApiProperty()
  applicationName!: string;

  @ApiProperty()
  applicantEmail!: string;

  @ApiPropertyOptional({ nullable: true })
  applicantUserId!: string | null;

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
  @ApiPropertyOptional({
    description:
      '現在の承認ステップで差し戻し可能か。審査中でない場合や現在ステップが無い場合は null。',
    nullable: true,
  })
  currentStepCanReturn!: boolean | null;

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
