import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { FORM_FIELD_TYPES } from '../../../models/constants/form-field-type';
import type { FormTemplateStatusValue } from '../../../models/constants/form-template-status';

export class CreateFormTemplateDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: '経費申請' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: '経費精算用' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class FormFieldResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fieldKey!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  fieldType!: string;

  @ApiProperty()
  required!: boolean;

  @ApiPropertyOptional()
  placeholder!: string | null;

  @ApiPropertyOptional()
  helpText!: string | null;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  options!: unknown[] | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: string;
}

export class FormTemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status!: FormTemplateStatusValue;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty({ type: [FormFieldResponseDto] })
  fields!: FormFieldResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class FormTemplatesListResponseDto {
  @ApiProperty({ type: [FormTemplateResponseDto] })
  templates!: FormTemplateResponseDto[];
}

export class CreateFormFieldDto {
  @ApiProperty({ example: 'expense_title' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  fieldKey!: string;

  @ApiProperty({ example: '件名' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label!: string;

  @ApiProperty({ example: 'text', enum: FORM_FIELD_TYPES })
  @IsString()
  @IsIn(FORM_FIELD_TYPES)
  fieldType!: (typeof FORM_FIELD_TYPES)[number];

  @ApiProperty()
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  helpText?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  options?: unknown[];
}

export class MoveFormFieldDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  @IsString()
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}

export class UpdateFormFieldSettingsDto {
  @ApiPropertyOptional({ example: '件名' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label?: string;

  @ApiProperty({ example: 'text', enum: FORM_FIELD_TYPES })
  @IsString()
  @IsIn(FORM_FIELD_TYPES)
  fieldType!: (typeof FORM_FIELD_TYPES)[number];

  @ApiProperty()
  @IsBoolean()
  required!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  helpText?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  options?: unknown[];
}

export class RequestFormAccessDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

export class RequestFormAccessResponseDto {
  @ApiProperty({ example: true })
  accepted!: true;
}
