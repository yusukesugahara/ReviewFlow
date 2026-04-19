import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength, MinLength } from 'class-validator';

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
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password12', minLength: 8 })
  @MinLength(8)
  password!: string;
}

/**
 * Response DTO
 */

export class AuthUserSummaryDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'user', enum: ['admin', 'user'] })
  role!: string;
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

  @ApiProperty({ type: [String], example: ['user'] })
  roles!: string[];
}

export class AdminPingResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}
