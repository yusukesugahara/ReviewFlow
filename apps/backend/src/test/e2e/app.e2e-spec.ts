import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { requestContextMiddleware } from '../../common/logging/request-context.middleware';
import { UserRole } from '../../models/constants/user-role';
import { User } from '../../models/entities/user.entity';

type ErrorJsonBody = { errorCode?: string };
type LoginJsonBody = { data?: { access_token?: string } };
type RegisterJsonBody = { data?: { user?: { role?: string; id?: string } } };
type MeJsonBody = {
  status?: number;
  data?: { id?: string; email?: string; roles?: string[]; tenantId?: string };
};
type InviteCreateJsonBody = {
  data?: { token?: string; email?: string; role?: string; expiresAt?: string };
};

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const dbPath = join(__dirname, 'e2e-test.sqlite');

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

  it('POST /auth/login rejects without API key (401 + errorCode)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'password12' })
      .expect(401);
    expect((res.body as ErrorJsonBody).errorCode).toBe('AUTH_API_KEY_MISSING');
  });

  it('GET /health returns 200 without API key or JWT', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /ready returns 200 and database up (Terminus)', async () => {
    const res = await request(app.getHttpServer()).get('/ready').expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('first registered user is tenant_admin; admin ping OK; applicant gets 403', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    const reg1 = await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'admin@e2e.test', password: 'password12' })
      .expect(201);
    expect((reg1.body as RegisterJsonBody).data?.user?.role).toBe(
      'tenant_admin',
    );

    const login1 = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'admin@e2e.test', password: 'password12' })
      .expect(200);

    await request(http)
      .get('/auth/admin/ping')
      .set(apiKey)
      .set(
        'Authorization',
        `Bearer ${(login1.body as LoginJsonBody).data?.access_token ?? ''}`,
      )
      .expect(200);

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'user@e2e.test', password: 'password12' })
      .expect(201);

    const ds = app.get(DataSource);
    await ds.getRepository(User).update(
      { email: 'user@e2e.test' },
      { role: UserRole.APPLICANT },
    );

    const login2 = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'user@e2e.test', password: 'password12' })
      .expect(200);

    const forbidden = await request(http)
      .get('/auth/admin/ping')
      .set(apiKey)
      .set(
        'Authorization',
        `Bearer ${(login2.body as LoginJsonBody).data?.access_token ?? ''}`,
      )
      .expect(403);
    expect((forbidden.body as ErrorJsonBody).errorCode).toBe(
      'AUTH_FORBIDDEN_ROLE',
    );
  });

  it('POST /auth/register returns 409 when email is already taken', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'dup@e2e.test', password: 'password12' })
      .expect(201);

    const conflict = await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'dup@e2e.test', password: 'password12' })
      .expect(409);
    expect((conflict.body as ErrorJsonBody).errorCode).toBe('AUTH_EMAIL_TAKEN');
  });

  it('POST /auth/login returns 401 for wrong password', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'login@e2e.test', password: 'password12' })
      .expect(201);

    const res = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'login@e2e.test', password: 'wrongpassword1' })
      .expect(401);
    expect((res.body as ErrorJsonBody).errorCode).toBe(
      'AUTH_INVALID_CREDENTIALS',
    );
  });

  it('POST /auth/me returns 401 without bearer token', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    const res = await request(http).post('/auth/me').set(apiKey).expect(401);
    expect((res.body as ErrorJsonBody).errorCode).toBe('AUTH_JWT_UNAUTHORIZED');
  });

  it('POST /auth/me returns current user with valid JWT', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'me@e2e.test', password: 'password12' })
      .expect(201);

    const login = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'me@e2e.test', password: 'password12' })
      .expect(200);

    const token = (login.body as LoginJsonBody).data?.access_token ?? '';
    const me = await request(http)
      .post('/auth/me')
      .set(apiKey)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = me.body as MeJsonBody;
    expect(body.status).toBe(200);
    expect(body.data?.email).toBe('me@e2e.test');
    expect(body.data?.roles).toEqual(['tenant_admin']);
    expect(typeof body.data?.id).toBe('string');
  });

  it('rejects invalid X-API-Key', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-API-Key', 'wrong-key')
      .send({ email: 'a@b.com', password: 'password12' })
      .expect(401);
    expect((res.body as ErrorJsonBody).errorCode).toBe('AUTH_API_KEY_INVALID');
  });

  it('POST /auth/register returns 400 for invalid email (validation)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-API-Key', 'e2e-internal-api-key')
      .send({ email: 'not-an-email', password: 'password12' })
      .expect(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('POST /invitations then accept creates member with JWT', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'inv-admin@e2e.test', password: 'password12' })
      .expect(201);

    const loginAdmin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'inv-admin@e2e.test', password: 'password12' })
      .expect(200);
    const adminToken =
      (loginAdmin.body as LoginJsonBody).data?.access_token ?? '';

    const created = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'inv-member@e2e.test', role: 'applicant' })
      .expect(201);

    const inviteBody = created.body as InviteCreateJsonBody;
    expect(inviteBody.data?.email).toBe('inv-member@e2e.test');
    expect(typeof inviteBody.data?.token).toBe('string');
    expect(inviteBody.data?.token?.length).toBeGreaterThanOrEqual(32);

    const accepted = await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: inviteBody.data?.token,
        name: 'Invited Member',
        password: 'password12',
      })
      .expect(200);

    const memberToken =
      (accepted.body as LoginJsonBody).data?.access_token ?? '';
    expect(memberToken.length).toBeGreaterThan(10);

    const me = await request(http)
      .post('/auth/me')
      .set(apiKey)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    const meBody = me.body as MeJsonBody;
    expect(meBody.data?.email).toBe('inv-member@e2e.test');
    expect(meBody.data?.roles).toEqual(['applicant']);
  });

  it('POST /invitations returns 403 for applicant', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'inv-org-admin@e2e.test', password: 'password12' })
      .expect(201);

    const adminLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'inv-org-admin@e2e.test', password: 'password12' })
      .expect(200);
    const adminTok =
      (adminLogin.body as LoginJsonBody).data?.access_token ?? '';

    const invRes = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ email: 'inv-applicant@e2e.test', role: 'applicant' })
      .expect(201);
    const tok = (invRes.body as InviteCreateJsonBody).data?.token ?? '';

    const accLogin = await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({ token: tok, password: 'password12' })
      .expect(200);
    const applicantTok =
      (accLogin.body as LoginJsonBody).data?.access_token ?? '';

    const forbidden = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${applicantTok}`)
      .send({ email: 'inv-should-fail@e2e.test', role: 'approver' })
      .expect(403);
    expect((forbidden.body as ErrorJsonBody).errorCode).toBe(
      'AUTH_FORBIDDEN_ROLE',
    );
  });
});
