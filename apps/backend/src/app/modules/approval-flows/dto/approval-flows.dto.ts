import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateApprovalFlowStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  stepOrder!: number;

  @ApiProperty({ example: '一次承認' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  stepName!: string;

  @ApiProperty({
    format: 'uuid',
    required: false,
    description: 'このステップを承認するテナント内ユーザID',
  })
  @ValidateIf(
    (step: CreateApprovalFlowStepDto) =>
      !step.assigneeUserIds || step.assigneeUserIds.length === 0,
  )
  @IsUUID()
  assigneeUserId?: string;

  @ApiProperty({
    format: 'uuid',
    isArray: true,
    required: false,
    description:
      'このステップを承認できるテナント内ユーザID一覧。指定時はこちらを優先し、assigneeUserId は後方互換用の代表者として扱う。',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  assigneeUserIds?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  canReturn!: boolean;
}

export class CreateApprovalFlowDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: '経費申請フロー' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ type: [CreateApprovalFlowStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalFlowStepDto)
  steps!: CreateApprovalFlowStepDto[];
}

export class ApprovalStepResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  stepOrder!: number;

  @ApiProperty()
  stepName!: string;

  @ApiProperty()
  assigneeUserId!: string;

  @ApiProperty({ isArray: true })
  assigneeUserIds!: string[];

  @ApiProperty()
  canReturn!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class ApprovalFlowResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [ApprovalStepResponseDto] })
  steps!: ApprovalStepResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ApprovalFlowsListResponseDto {
  @ApiProperty({ type: [ApprovalFlowResponseDto] })
  flows!: ApprovalFlowResponseDto[];
}
