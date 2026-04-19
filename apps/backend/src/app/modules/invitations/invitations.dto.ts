import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { INVITATION_ASSIGNABLE_ROLES } from '../../../models/constants/invitation-role';

export class CreateInvitationDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'approver',
    enum: INVITATION_ASSIGNABLE_ROLES,
  })
  @IsString()
  @IsIn(INVITATION_ASSIGNABLE_ROLES)
  role!: (typeof INVITATION_ASSIGNABLE_ROLES)[number];
}

export class CreateInvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: '受諾 API に渡すワンタイムトークン' })
  token!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ description: 'ISO 8601' })
  expiresAt!: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ description: '招待作成時に発行された token' })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @ApiPropertyOptional({ example: '山田 太郎' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'password12', minLength: 8, maxLength: 72 })
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
