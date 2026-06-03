/**
 * CI / ローカルで `schema.json` を再生成する（本番起動不要）。
 * `npm run openapi:emit`
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app/app.module';
import { buildOpenApiBaseConfig } from '../app/swagger-document.config';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

async function emit(): Promise<void> {
  process.env.DB_HOST ??= '127.0.0.1';
  process.env.DB_PORT ??= '5432';
  process.env.DB_USERNAME ??= 'app';
  process.env.DB_PASSWORD ??= 'app';
  process.env.DB_NAME ??= 'app';

  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    const config = buildOpenApiBaseConfig();
    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [ErrorResponseDto],
    });

    const out = join(process.cwd(), 'schema.json');
    writeFileSync(out, JSON.stringify(document, null, 2), 'utf8');
  } finally {
    await app.close();
  }
}

void emit().catch((err: unknown) => {
  console.error('openapi emit failed:', err);
  process.exit(1);
});
