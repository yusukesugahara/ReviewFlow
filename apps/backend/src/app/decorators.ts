import {
  type Type,
  applyDecorators,
  SetMetadata,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  getSchemaPath,
  ApiExtraModels,
  ApiSecurity,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  SKIP_JWT_KEY,
  SWAGGER_API_KEY_NAME,
  SWAGGER_JWT_AUTH_KEY,
  ROLES_KEY,
} from '../common/constants';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * 内部 **X-API-Key** のみ。JWT は検証しない（`SKIP_JWT_KEY` メタデータ）。
 * Swagger に API Key セキュリティを表示する。
 */
export function Api() {
  return applyDecorators(
    UseGuards(InternalApiKeyGuard),
    SetMetadata(SKIP_JWT_KEY, true),
    ApiSecurity(SWAGGER_API_KEY_NAME),
  );
}

/**
 * **X-API-Key** + **Bearer JWT**（Nest 発行トークン）。
 * Swagger に API Key と Bearer の両方を表示する。
 */
export function AuthApi() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiSecurity(SWAGGER_API_KEY_NAME),
    ApiBearerAuth(SWAGGER_JWT_AUTH_KEY),
  );
}

/**
 * ロールベースの認可。`@Roles()` で指定したロールのみアクセス可能。
 */
export function ApiRoles(...roles: string[]) {
  return applyDecorators(UseGuards(RolesGuard), SetMetadata(ROLES_KEY, roles));
}

/**
 * @see https://github.com/nestjs/throttler/blob/main/src/throttler.decorator.ts
 *
 * レート制限デコレータ
 * @param options レート制限オプション。`limit` と `ttl` は必須。
 * - `limit`: レート制限値
 * - `ttl`: レート制限の窓幅（ミリ秒）
 * - `blockDuration`: ブロック期間（ミリ秒）
 * - `getTracker`: トラッカー関数
 * - `generateKey`: キー生成関数
 * @returns MethodDecorator & ClassDecorator
 */
export function RateLimit(
  options: Parameters<typeof Throttle>[0],
): ReturnType<typeof Throttle> {
  return Throttle(options);
}

/**
 * 成功レスポンスのスキーマを Swagger に載せる。引数は DTO クラスのみ（ドキュメント上のステータスは 200）。
 * 実際の HTTP が 201 など別ステータスなら `@HttpCode(...)` を別に付与する。
 */
/** 実レスポンスは `successResponse()` による `{ status: 200, data: T }` */
export function ApiSuccessResponse<T>(dto: Type<T>) {
  return applyDecorators(
    HttpCode(200),
    ApiExtraModels(dto),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: {
            type: 'number',
            enum: [200],
            example: 200,
          },
          data: { $ref: getSchemaPath(dto) },
        },
      },
    }),
  );
}

/**
 * HTTP **201 Created** の成功レスポンスを Swagger に載せる（ボディは `successResponse()` と同形）。
 * メソッド側の `@HttpCode(HttpStatus.CREATED)` と併用する。
 */
export function ApiSuccessResponseCreated<T>(dto: Type<T>) {
  return applyDecorators(
    ApiExtraModels(dto),
    ApiCreatedResponse({
      schema: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: {
            type: 'number',
            enum: [200],
            example: 200,
          },
          data: { $ref: getSchemaPath(dto) },
        },
      },
    }),
  );
}
