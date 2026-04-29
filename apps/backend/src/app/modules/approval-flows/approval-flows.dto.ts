import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
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
    description: 'このステップを承認するテナント内ユーザーID',
  })
  @IsUUID()
  assigneeUserId!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  canReturn!: boolean;
}

export class CreateApprovalFlowDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  formTemplateId!: string;

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

  @ApiProperty()
  canReturn!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class ApprovalFlowResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  formTemplateId!: string;

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
