import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestContextMiddleware } from '../../common/logging/request-context.middleware';

describe('Request Context (e2e)', () => {
  let app: INestApplication<App>;
  const dbPath = join(__dirname, 'e2e-request-context.sqlite');

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'e2e-internal-api-key';
    process.env.JWT_SECRET = 'e2e-jwt-secret-at-least-32-characters-long';
    process.env.DB_PATH = dbPath;
    try {
      rmSync(dbPath, { force: true });
    } catch {
      /* ignore */
    }
    mkdirSync(join(dbPath, '..'), { recursive: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.enableShutdownHooks();
    app.use(json({ limit: '256kb' }));
    app.use(urlencoded({ extended: true, limit: '256kb' }));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.use(requestContextMiddleware);
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    try {
      rmSync(dbPath, { force: true });
    } catch {
      /* ignore */
    }
  });

  it('echoes incoming X-Request-Id header', async () => {
    const requestId = 'req-e2e-custom-id';
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Request-Id', requestId)
      .send({ email: 'nobody@example.com', password: 'password12' })
      .expect(401);

    expect(res.headers['x-request-id']).toBe(requestId);
  });

  it('generates X-Request-Id when header is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password12' })
      .expect(401);

    expect(typeof res.headers['x-request-id']).toBe('string');
    expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
  });
});
