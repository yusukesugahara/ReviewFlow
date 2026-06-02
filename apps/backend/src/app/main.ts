import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { writeFileSync } from 'fs';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { assertProductionEnvFromProcess } from './bootstrap-env';
import { buildOpenApiBaseConfig } from './swagger-document.config';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { requestContextMiddleware } from '../common/logging/request-context.middleware';

async function bootstrap() {
  assertProductionEnvFromProcess();

  const bodyLimit = process.env.JSON_BODY_LIMIT ?? '256kb';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.enableShutdownHooks();
  app.useLogger(app.get(Logger));

  if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  const isProd = process.env.NODE_ENV === 'production';
  // Express ではヘッダ系を先に（Nest 公式: helmet はルートより前に）
  app.use(helmet(isProd ? {} : { contentSecurityPolicy: false }));

  // 監査ログ相関用の request-id を全リクエストへ付与
  app.use(requestContextMiddleware);

  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const enableSwagger = process.env.ENABLE_SWAGGER === '1' || !isProd;
  if (enableSwagger) {
    const config = buildOpenApiBaseConfig();
    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [ErrorResponseDto],
    });
    // OpenAPI JSON: GET /schema.json（未指定時は /docs-json）
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'schema.json',
    });
    writeFileSync('schema.json', JSON.stringify(document, null, 2), 'utf8');
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
