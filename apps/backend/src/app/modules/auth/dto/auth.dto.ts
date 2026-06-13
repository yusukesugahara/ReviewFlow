import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../../models/constants/user-role';

/**
 * Request DTO
 */

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password12', minLength: 8, maxLength: 72 })
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({
    example: 'Acme Inc',
    description: '新規テナント名（省略時は既定のワークスペース名）',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  organizationName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password12', minLength: 8 })
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description:
      '同一メールで複数テナントに所属する場合に指定（`docs/08_auth_and_multitenant.md`）',
  })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'reset-token' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'password12', minLength: 8, maxLength: 72 })
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class UpdateMeProfileDto {
  @ApiPropertyOptional({ example: '山田 太郎', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

export class UpdateMePasswordDto {
  @ApiProperty({ example: 'current-password', minLength: 8, maxLength: 72 })
  @MinLength(8)
  @MaxLength(72)
  currentPassword!: string;

  @ApiProperty({ example: 'new-password12', minLength: 8, maxLength: 72 })
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

/**
 * Response DTO
 */

export class AuthUserSummaryDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({
    example: UserRole.TENANT_ADMIN,
    enum: Object.values(UserRole),
  })
  role!: string;

  @ApiProperty({ example: 'uuid', description: '所属テナント ID' })
  tenantId!: string;
}

export class AuthIssueTokensResponseDto {
  @ApiProperty({ description: 'Nest が発行した JWT' })
  access_token!: string;

  @ApiProperty({ type: AuthUserSummaryDto })
  user!: AuthUserSummaryDto;
}

export class AuthMeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: [String], example: ['tenant_admin'] })
  roles!: string[];

  @ApiProperty({ description: '所属テナント ID' })
  tenantId!: string;
}

export class AdminPingResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class PasswordResetAcceptedResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}
