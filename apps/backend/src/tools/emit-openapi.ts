/**
 * CI / ローカルで `schema.json` を再生成する（本番起動不要）。
 * `npm run openapi:emit`
 */
import 'reflect-metadata';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app/app.module';
import { buildOpenApiBaseConfig } from '../app/swagger-document.config';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

async function emit(): Promise<void> {
  const dbFile = join(tmpdir(), `openapi-emit-${process.pid}.sqlite`);
  process.env.DB_PATH = dbFile;
  mkdirSync(join(dbFile, '..'), { recursive: true });

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
  try {
    unlinkSync(dbFile);
  } catch {
    /* ignore */
  }
}

void emit().catch((err: unknown) => {
  console.error('openapi emit failed:', err);
  process.exit(1);
});
