import { DocumentBuilder } from '@nestjs/swagger';
import { SWAGGER_JWT_AUTH_KEY } from '../common/constants';

/** Swagger `DocumentBuilder` の共通設定（`main` とスキーマ emit で共有） */
export function buildOpenApiBaseConfig() {
  return new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription(
      [
        'The cats API description.',
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
