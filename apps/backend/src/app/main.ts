import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { writeFileSync } from 'fs';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApiBaseConfig } from './swagger-document.config';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { requestContextMiddleware } from '../common/logging/request-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const bodyLimit = config.get<string>('JSON_BODY_LIMIT') ?? '256kb';

  app.enableShutdownHooks();
  app.useLogger(app.get(Logger));

  if (config.get<string>('TRUST_PROXY') === '1') {
    app.set('trust proxy', 1);
  }

  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  app.use(helmet(isProd ? {} : { contentSecurityPolicy: false }));

  app.use(requestContextMiddleware);

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
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

  const enableSwagger = config.get<string>('ENABLE_SWAGGER') === '1' || !isProd;
  if (enableSwagger) {
    const openApiConfig = buildOpenApiBaseConfig();
    const document = SwaggerModule.createDocument(app, openApiConfig, {
      extraModels: [ErrorResponseDto],
    });
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'schema.json',
    });
    writeFileSync('schema.json', JSON.stringify(document, null, 2), 'utf8');
  }

  await app.listen(Number(config.get<string>('PORT') ?? 3000));
}
void bootstrap();
