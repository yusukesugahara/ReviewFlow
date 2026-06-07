import { DocumentBuilder } from '@nestjs/swagger';
import { SWAGGER_JWT_AUTH_KEY } from '../common/constants';

/** Swagger `DocumentBuilder` の共通設定（`main` とスキーマ emit で共有） */
export function buildOpenApiBaseConfig() {
  return new DocumentBuilder()
    .setTitle('ReviewFlow API')
    .setDescription(
      [
        'ReviewFlow のバックエンド API。申請フォーム、申請、承認、スペース、ユーザ、CSV 出力、監査ログを扱う。',
        '',
        'UI 上の「スペース」は、後方互換のため API path と request/response property では `groups` / `groupId` として公開する。',
        '',
        'エラー: コントローラーで個別のエラーレスポンスは宣言しない。`throw new Error()` や `BaseError` / `HttpException` は `GlobalExceptionFilter` が JSON（`components.schemas.ErrorResponseDto` の最小形: statusCode, message）に正規化する。',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
      },
      'X-API-Key',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      SWAGGER_JWT_AUTH_KEY,
    )
    .build();
}
