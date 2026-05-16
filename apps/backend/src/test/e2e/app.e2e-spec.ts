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

jest.setTimeout(15_000);

type ErrorJsonBody = { errorCode?: string };
type LoginJsonBody = {
  data?: { access_token?: string; user?: { id?: string } };
};
type RegisterJsonBody = { data?: { user?: { role?: string; id?: string } } };
type MeJsonBody = {
  status?: number;
  data?: { id?: string; email?: string; roles?: string[]; tenantId?: string };
};
type InviteCreateJsonBody = {
  data?: { token?: string; email?: string; role?: string; expiresAt?: string };
};
type UsersListJsonBody = {
  data?: {
    users?: { id: string; email: string; role: string; isActive?: boolean }[];
  };
};
type GroupCreateJsonBody = { data?: { id?: string } };
type FormDefinitionsListBody = {
  data?: { definitions?: { id: string; name: string; status: string }[] };
};
type FormDefinitionCreateBody = {
  data?: { id: string; name: string; status: string };
};
type FormDefinitionGetBody = {
  data?: {
    id: string;
    name: string;
    status: string;
    fields?: { id: string; fieldKey: string }[];
  };
};
type ApprovalFlowsListBody = {
  data?: {
    flows?: {
      id: string;
      name: string;
      steps?: { stepOrder: number; stepName: string }[];
    }[];
  };
};
type ApprovalFlowCreateBody = { data?: { id?: string } };
type ApplicationCreateBody = { data?: { id?: string; status?: string } };
type ApplicationsListJsonBody = {
  data?: {
    applications?: { id: string; status: string; applicantUserId?: string }[];
  };
};
type ApplicationDetailBody = {
  data?: { id?: string; status?: string; values?: Record<string, unknown> };
};
type CorrectionsListBody = {
  data?: {
    corrections?: {
      id: string;
      status: string;
      items?: { formFieldId: string }[];
    }[];
  };
};
type CorrectionTargetsBody = {
  data?: {
    applicationStatus?: string;
    openCorrection?: {
      id: string;
      items?: {
        formFieldId: string;
        fieldKey: string;
        currentValue?: unknown;
      }[];
    } | null;
  };
};

async function fetchMeId(
  http: App,
  apiKey: Record<string, string>,
  token: string,
): Promise<string> {
  const res = await request(http)
    .post('/auth/me')
    .set(apiKey)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return (res.body as MeJsonBody).data?.id ?? '';
}

async function createGroupForAdmin(
  http: App,
  apiKey: Record<string, string>,
  token: string,
  adminUserId: string,
  name: string,
): Promise<string> {
  const res = await request(http)
    .post('/groups')
    .set(apiKey)
    .set('Authorization', `Bearer ${token}`)
    .send({ name, adminUserIds: [adminUserId] })
    .expect(201);
  return (res.body as GroupCreateJsonBody).data?.id ?? '';
}
type ExportJobBody = {
  data?: { id?: string; status?: string; filePath?: string | null };
};
type AuditLogsListBody = {
  data?: {
    logs?: {
      id: string;
      groupId: string | null;
      actionType: string;
      targetType: string;
    }[];
  };
};

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const dbPath = join(__dirname, 'e2e-test.sqlite');

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'e2e-internal-api-key';
    process.env.JWT_SECRET = 'e2e-jwt-secret-at-least-32-characters-long';
    process.env.DB_PATH = dbPath;
    process.env.MAIL_ENABLED = '0';
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
    await ds
      .getRepository(User)
      .update({ email: 'user@e2e.test' }, { role: UserRole.TENANT_USER });

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
      .send({ email: 'inv-member@e2e.test', role: 'tenant_user' })
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
    expect(meBody.data?.roles).toEqual(['tenant_user']);
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
      .send({ email: 'inv-applicant@e2e.test', role: 'tenant_user' })
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
      .send({ email: 'inv-should-fail@e2e.test', role: 'tenant_user' })
      .expect(403);
    expect((forbidden.body as ErrorJsonBody).errorCode).toBe(
      'AUTH_FORBIDDEN_ROLE',
    );
  });

  it('GET /users lists tenant members; PATCH role updates member; DELETE deactivates member', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'list-admin@e2e.test', password: 'password12' })
      .expect(201);

    const adminLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'list-admin@e2e.test', password: 'password12' })
      .expect(200);
    const adminTok =
      (adminLogin.body as LoginJsonBody).data?.access_token ?? '';

    const list1 = await request(http)
      .get('/users')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    expect((list1.body as UsersListJsonBody).data?.users?.length).toBe(1);

    const inv = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ email: 'list-member@e2e.test', role: 'tenant_user' })
      .expect(201);
    const invTok = (inv.body as InviteCreateJsonBody).data?.token ?? '';

    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({ token: invTok, password: 'password12' })
      .expect(200);

    const list2 = await request(http)
      .get('/users')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    const users = (list2.body as UsersListJsonBody).data?.users ?? [];
    expect(users.length).toBe(2);
    const member = users.find((u) => u.email === 'list-member@e2e.test');
    expect(member?.role).toBe('tenant_user');

    const patchRes = await request(http)
      .patch(`/users/${member?.id}/role`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ role: 'tenant_user' })
      .expect(200);
    expect((patchRes.body as { data?: { role?: string } }).data?.role).toBe(
      'tenant_user',
    );

    await request(http)
      .delete(`/users/${member?.id}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(204);

    const list3 = await request(http)
      .get('/users')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    const deleted = ((list3.body as UsersListJsonBody).data?.users ?? []).find(
      (u) => u.email === 'list-member@e2e.test',
    );
    expect(deleted?.isActive).toBe(false);

    const deletedLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'list-member@e2e.test', password: 'password12' })
      .expect(401);
    expect((deletedLogin.body as ErrorJsonBody).errorCode).toBe(
      'AUTH_INVALID_CREDENTIALS',
    );

    const restoreRes = await request(http)
      .patch(`/users/${member?.id}/restore`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    expect(
      (restoreRes.body as { data?: { isActive?: boolean } }).data?.isActive,
    ).toBe(true);

    await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'list-member@e2e.test', password: 'password12' })
      .expect(200);
  });

  it('form-definitions: create, add field, publish, list', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'form-admin@e2e.test', password: 'password12' })
      .expect(201);

    const login = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'form-admin@e2e.test', password: 'password12' })
      .expect(200);
    const tok = (login.body as LoginJsonBody).data?.access_token ?? '';
    const adminId = await fetchMeId(http, apiKey, tok);
    const groupId = await createGroupForAdmin(
      http,
      apiKey,
      tok,
      adminId,
      'form-space',
    );

    const created = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .send({ groupId, name: '経費申請', description: 'desc' })
      .expect(201);
    const tid = (created.body as FormDefinitionCreateBody).data?.id ?? '';
    expect((created.body as FormDefinitionCreateBody).data?.status).toBe(
      'draft',
    );
    const secondCreated = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .send({ groupId, name: '稟議申請', description: 'desc' })
      .expect(201);
    const secondTid =
      (secondCreated.body as FormDefinitionCreateBody).data?.id ?? '';

    await request(http)
      .post(`/form-definitions/${tid}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .send({
        fieldKey: 'title',
        label: '件名',
        fieldType: 'text',
        required: true,
        sortOrder: 1,
        options: [],
      })
      .expect(201);

    await request(http)
      .post(`/form-definitions/${tid}/publish`)
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .expect(200);

    await request(http)
      .post(`/form-definitions/${secondTid}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .send({
        fieldKey: 'subject',
        label: '件名',
        fieldType: 'text',
        required: true,
        sortOrder: 1,
        options: [],
      })
      .expect(201);

    await request(http)
      .post(`/form-definitions/${secondTid}/publish`)
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .expect(200);

    const list = await request(http)
      .get('/form-definitions')
      .query({ groupId })
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .expect(200);
    const definitions =
      (list.body as FormDefinitionsListBody).data?.definitions ?? [];
    const one = definitions.find((t) => t.id === tid);
    expect(one?.status).toBe('published');
    expect(one?.name).toBe('経費申請');
    const second = definitions.find((t) => t.id === secondTid);
    expect(second?.status).toBe('published');
    expect(second?.name).toBe('稟議申請');

    const got = await request(http)
      .get(`/form-definitions/${tid}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .expect(200);
    expect((got.body as FormDefinitionGetBody).data?.id).toBe(tid);
    expect((got.body as FormDefinitionGetBody).data?.fields?.length).toBe(1);

    await request(http)
      .post('/approval-flows')
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .send({
        groupId,
        name: '経費申請フロー',
        steps: [
          {
            stepOrder: 1,
            stepName: '一次承認',
            assigneeUserId: adminId,
            canReturn: true,
          },
          {
            stepOrder: 2,
            stepName: '最終承認',
            assigneeUserId: adminId,
            canReturn: true,
          },
        ],
      })
      .expect(201);

    const flowsRes = await request(http)
      .get('/approval-flows')
      .query({ groupId })
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .expect(200);
    const flows = (flowsRes.body as ApprovalFlowsListBody).data?.flows ?? [];
    expect(flows.length).toBeGreaterThanOrEqual(1);
    const flow = flows.find((f) => f.name === '経費申請フロー');
    expect(flow?.name).toBe('経費申請フロー');
    expect(flow?.steps?.length).toBe(2);

    await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .send({
        groupId,
        formDefinitionId: secondTid,
        approvalFlowId: flow?.id,
        status: 'published',
        values: {},
      })
      .expect(201)
      .expect((res) => {
        expect((res.body as ApplicationCreateBody).data?.status).toBe(
          'published',
        );
      });
  });

  it('space scope: group roles gate templates and applications', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'scope-admin@e2e.test', password: 'password12' })
      .expect(201);
    const adminLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'scope-admin@e2e.test', password: 'password12' })
      .expect(200);
    const adminTok =
      (adminLogin.body as LoginJsonBody).data?.access_token ?? '';
    const adminId = await fetchMeId(http, apiKey, adminTok);
    const groupA = await createGroupForAdmin(
      http,
      apiKey,
      adminTok,
      adminId,
      'scope-a',
    );
    const groupB = await createGroupForAdmin(
      http,
      apiKey,
      adminTok,
      adminId,
      'scope-b',
    );

    const adminInvite = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        email: 'scope-group-admin@e2e.test',
        role: 'tenant_user',
        groupId: groupA,
        groupRole: 'admin',
      })
      .expect(201);
    const userInvite = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        email: 'scope-group-user@e2e.test',
        role: 'tenant_user',
        groupId: groupA,
        groupRole: 'user',
      })
      .expect(201);

    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: (adminInvite.body as InviteCreateJsonBody).data?.token ?? '',
        name: 'Group Admin',
        password: 'password12',
      })
      .expect(200);
    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: (userInvite.body as InviteCreateJsonBody).data?.token ?? '',
        name: 'Group User',
        password: 'password12',
      })
      .expect(200);

    const groupAdminLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'scope-group-admin@e2e.test', password: 'password12' })
      .expect(200);
    const groupAdminTok =
      (groupAdminLogin.body as LoginJsonBody).data?.access_token ?? '';
    const groupUserLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'scope-group-user@e2e.test', password: 'password12' })
      .expect(200);
    const groupUserTok =
      (groupUserLogin.body as LoginJsonBody).data?.access_token ?? '';

    const createdTpl = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${groupAdminTok}`)
      .send({ groupId: groupA, name: 'Group Admin Form' })
      .expect(201);
    const tplA = (createdTpl.body as FormDefinitionCreateBody).data?.id ?? '';

    await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${groupUserTok}`)
      .send({ groupId: groupA, name: 'Forbidden Form' })
      .expect(403);

    await request(http)
      .post(`/form-definitions/${tplA}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${groupAdminTok}`)
      .send({
        fieldKey: 'title',
        label: '件名',
        fieldType: 'text',
        required: true,
        sortOrder: 1,
        options: [],
      })
      .expect(201);
    await request(http)
      .post(`/form-definitions/${tplA}/publish`)
      .set(apiKey)
      .set('Authorization', `Bearer ${groupAdminTok}`)
      .expect(200);
    const flowRes = await request(http)
      .post('/approval-flows')
      .set(apiKey)
      .set('Authorization', `Bearer ${groupAdminTok}`)
      .send({
        groupId: groupA,
        name: 'Group A Flow',
        steps: [
          {
            stepOrder: 1,
            stepName: 'Admin approval',
            assigneeUserId: adminId,
            canReturn: false,
          },
        ],
      })
      .expect(201);
    const flowId = (flowRes.body as ApprovalFlowCreateBody).data?.id ?? '';

    const setupApp = await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${groupAdminTok}`)
      .send({
        groupId: groupA,
        formDefinitionId: tplA,
        approvalFlowId: flowId,
        status: 'published',
        values: {},
      })
      .expect(201);
    const setupAppId = (setupApp.body as ApplicationCreateBody).data?.id ?? '';

    const groupAdminApps = await request(http)
      .get('/applications')
      .query({ groupId: groupA })
      .set(apiKey)
      .set('Authorization', `Bearer ${groupAdminTok}`)
      .expect(200);
    const groupAdminVisibleApps =
      (groupAdminApps.body as ApplicationsListJsonBody).data?.applications ??
      [];
    expect(groupAdminVisibleApps.some((row) => row.id === setupAppId)).toBe(
      true,
    );

    await request(http)
      .get(`/applications/${setupAppId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${groupAdminTok}`)
      .expect(200);

    await request(http)
      .get(`/applications/${setupAppId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${groupUserTok}`)
      .expect(403);

    const appA = await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${groupUserTok}`)
      .send({
        groupId: groupA,
        values: { title: 'allowed' },
      })
      .expect(201);
    const appAId = (appA.body as ApplicationCreateBody).data?.id ?? '';

    const tplB = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ groupId: groupB, name: 'Group B Form' })
      .expect(201);
    expect((tplB.body as FormDefinitionCreateBody).data?.id).toBeTruthy();

    await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${groupUserTok}`)
      .send({ groupId: groupB, values: {} })
      .expect(403);
    await request(http)
      .get(`/applications/${appAId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${groupUserTok}`)
      .expect(200);
  });

  it('applications: applicant creates draft, submits; approver sees queue', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'app-org-admin@e2e.test', password: 'password12' })
      .expect(201);

    const adminLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'app-org-admin@e2e.test', password: 'password12' })
      .expect(200);
    const adminTok =
      (adminLogin.body as LoginJsonBody).data?.access_token ?? '';
    const adminId = await fetchMeId(http, apiKey, adminTok);
    const groupId = await createGroupForAdmin(
      http,
      apiKey,
      adminTok,
      adminId,
      'app-space',
    );

    const createdTpl = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ groupId, name: '申請用フォーム' })
      .expect(201);
    const tplId = (createdTpl.body as FormDefinitionCreateBody).data?.id ?? '';

    await request(http)
      .post(`/form-definitions/${tplId}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        fieldKey: 'title',
        label: '件名',
        fieldType: 'text',
        required: true,
        sortOrder: 1,
        options: [],
      })
      .expect(201);

    await request(http)
      .post(`/form-definitions/${tplId}/publish`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);

    await request(http)
      .post('/approval-flows')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        groupId,
        name: '単一承認者フロー',
        steps: [
          {
            stepOrder: 1,
            stepName: '承認',
            assigneeUserId: adminId,
            canReturn: false,
          },
        ],
      })
      .expect(201);

    const invApp = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        email: 'app-submitter@e2e.test',
        role: 'tenant_user',
        groupId,
        groupRole: 'user',
      })
      .expect(201);
    const invAppTok = (invApp.body as InviteCreateJsonBody).data?.token ?? '';

    const invApr = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        email: 'app-approver@e2e.test',
        role: 'tenant_user',
        groupId,
        groupRole: 'user',
      })
      .expect(201);
    const invAprTok = (invApr.body as InviteCreateJsonBody).data?.token ?? '';

    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: invAppTok,
        name: 'Submitter',
        password: 'password12',
      })
      .expect(200);

    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: invAprTok,
        name: 'Approver',
        password: 'password12',
      })
      .expect(200);

    const appLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'app-submitter@e2e.test', password: 'password12' })
      .expect(200);
    const appTok = (appLogin.body as LoginJsonBody).data?.access_token ?? '';

    const createdApp = await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok}`)
      .send({
        groupId,
        values: { title: '下書きタイトル' },
      })
      .expect(201);
    const appId = (createdApp.body as ApplicationCreateBody).data?.id ?? '';
    expect((createdApp.body as ApplicationCreateBody).data?.status).toBe(
      'draft',
    );

    const listDraft = await request(http)
      .get('/applications')
      .query({ groupId })
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok}`)
      .expect(200);
    expect(
      (listDraft.body as ApplicationsListJsonBody).data?.applications?.length,
    ).toBe(1);

    await request(http)
      .post(`/applications/${appId}/submit`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok}`)
      .expect(200);

    await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'app-approver@e2e.test', password: 'password12' })
      .expect(200);

    const queue = await request(http)
      .get('/applications')
      .query({ groupId })
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    const apps =
      (queue.body as ApplicationsListJsonBody).data?.applications ?? [];
    expect(apps.length).toBe(1);
    expect(apps[0]?.status).toBe('in_review');

    const detail = await request(http)
      .get(`/applications/${appId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    expect((detail.body as ApplicationDetailBody).data?.values?.title).toBe(
      '下書きタイトル',
    );

    await request(http)
      .post(`/applications/${appId}/approve`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({})
      .expect(200);

    const afterApprove = await request(http)
      .get(`/applications/${appId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    expect((afterApprove.body as ApplicationDetailBody).data?.status).toBe(
      'approved',
    );
  });

  it('applications: return, patch correction field, resubmit', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'ret-admin@e2e.test', password: 'password12' })
      .expect(201);

    const adminLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'ret-admin@e2e.test', password: 'password12' })
      .expect(200);
    const adminTok =
      (adminLogin.body as LoginJsonBody).data?.access_token ?? '';
    const adminId = await fetchMeId(http, apiKey, adminTok);
    const groupId = await createGroupForAdmin(
      http,
      apiKey,
      adminTok,
      adminId,
      'return-space',
    );

    const tplRes = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ groupId, name: '差し戻し用' })
      .expect(201);
    const tplId = (tplRes.body as FormDefinitionCreateBody).data?.id ?? '';

    await request(http)
      .post(`/form-definitions/${tplId}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        fieldKey: 'note',
        label: '備考',
        fieldType: 'text',
        required: true,
        sortOrder: 1,
        options: [],
      })
      .expect(201);

    await request(http)
      .post(`/form-definitions/${tplId}/publish`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);

    const tplDetail = await request(http)
      .get(`/form-definitions/${tplId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    const fieldId = (
      tplDetail.body as FormDefinitionGetBody
    ).data?.fields?.find((f) => f.fieldKey === 'note')?.id;
    expect(typeof fieldId).toBe('string');

    await request(http)
      .post('/approval-flows')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        groupId,
        name: '差し戻し可フロー',
        steps: [
          {
            stepOrder: 1,
            stepName: '承認',
            assigneeUserId: adminId,
            canReturn: true,
          },
        ],
      })
      .expect(201);

    const invA = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        email: 'ret-app@e2e.test',
        role: 'tenant_user',
        groupId,
        groupRole: 'user',
      })
      .expect(201);
    const invB = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        email: 'ret-apr@e2e.test',
        role: 'tenant_user',
        groupId,
        groupRole: 'user',
      })
      .expect(201);

    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: (invA.body as InviteCreateJsonBody).data?.token ?? '',
        password: 'password12',
      })
      .expect(200);
    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: (invB.body as InviteCreateJsonBody).data?.token ?? '',
        password: 'password12',
      })
      .expect(200);

    const appTok = (
      await request(http)
        .post('/auth/login')
        .set(apiKey)
        .send({ email: 'ret-app@e2e.test', password: 'password12' })
        .expect(200)
    ).body as LoginJsonBody;
    await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'ret-apr@e2e.test', password: 'password12' })
      .expect(200);

    const appCreate = await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .send({
        groupId,
        values: { note: 'v1' },
      })
      .expect(201);
    const retAppId = (appCreate.body as ApplicationCreateBody).data?.id ?? '';

    await request(http)
      .post(`/applications/${retAppId}/submit`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .expect(200);

    await request(http)
      .post(`/applications/${retAppId}/return`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        overallComment: '修正してください',
        fields: [{ fieldId, comment: '内容を具体化' }],
      })
      .expect(200);

    const corr = await request(http)
      .get(`/applications/${retAppId}/corrections`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .expect(200);
    expect(
      (corr.body as CorrectionsListBody).data?.corrections?.length,
    ).toBeGreaterThanOrEqual(1);

    const targets = await request(http)
      .get(`/applications/${retAppId}/correction-targets`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .expect(200);
    const tgt = targets.body as CorrectionTargetsBody;
    expect(tgt.data?.applicationStatus).toBe('returned');
    expect(tgt.data?.openCorrection?.items?.length).toBe(1);
    expect(tgt.data?.openCorrection?.items?.[0]?.fieldKey).toBe('note');
    expect(tgt.data?.openCorrection?.items?.[0]?.currentValue).toBe('v1');

    await request(http)
      .patch(`/applications/${retAppId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .send({ values: { note: 'v2-fixed' } })
      .expect(200);

    await request(http)
      .post(`/applications/${retAppId}/resubmit`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .expect(200);

    const again = await request(http)
      .get(`/applications/${retAppId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .expect(200);
    expect((again.body as ApplicationDetailBody).data?.status).toBe(
      'in_review',
    );
    expect((again.body as ApplicationDetailBody).data?.values?.note).toBe(
      'v2-fixed',
    );

    const afterResubmit = await request(http)
      .get(`/applications/${retAppId}/correction-targets`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok.data?.access_token ?? ''}`)
      .expect(200);
    expect(
      (afterResubmit.body as CorrectionTargetsBody).data?.openCorrection,
    ).toBeNull();
  });

  it('export-jobs: create status-filtered csv and download with expanded field columns', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'csv-admin@e2e.test', password: 'password12' })
      .expect(201);

    const adminLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'csv-admin@e2e.test', password: 'password12' })
      .expect(200);
    const adminTok =
      (adminLogin.body as LoginJsonBody).data?.access_token ?? '';
    const adminId = await fetchMeId(http, apiKey, adminTok);
    const groupId = await createGroupForAdmin(
      http,
      apiKey,
      adminTok,
      adminId,
      'csv-space',
    );

    const tpl = await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ groupId, name: 'CSV対象フォーム' })
      .expect(201);
    const tplId = (tpl.body as FormDefinitionCreateBody).data?.id ?? '';

    await request(http)
      .post(`/form-definitions/${tplId}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        fieldKey: 'expense_title',
        label: '件名',
        fieldType: 'text',
        required: true,
        sortOrder: 1,
        options: [],
      })
      .expect(201);
    await request(http)
      .post(`/form-definitions/${tplId}/fields`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        fieldKey: 'amount',
        label: '金額',
        fieldType: 'number',
        required: true,
        sortOrder: 2,
        options: [],
      })
      .expect(201);
    await request(http)
      .post(`/form-definitions/${tplId}/publish`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);

    await request(http)
      .post('/approval-flows')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        groupId,
        name: 'CSVフロー',
        steps: [
          {
            stepOrder: 1,
            stepName: '承認',
            assigneeUserId: adminId,
            canReturn: true,
          },
        ],
      })
      .expect(201);

    const inv = await request(http)
      .post('/invitations')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({
        email: 'csv-app@e2e.test',
        role: 'tenant_user',
        groupId,
        groupRole: 'user',
      })
      .expect(201);
    await request(http)
      .post('/invitations/accept')
      .set(apiKey)
      .send({
        token: (inv.body as InviteCreateJsonBody).data?.token ?? '',
        password: 'password12',
      })
      .expect(200);

    const appLogin = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'csv-app@e2e.test', password: 'password12' })
      .expect(200);
    const appTok = (appLogin.body as LoginJsonBody).data?.access_token ?? '';

    const created = await request(http)
      .post('/applications')
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok}`)
      .send({
        groupId,
        values: { expense_title: '旅費精算', amount: 12000 },
      })
      .expect(201);
    const appId = (created.body as ApplicationCreateBody).data?.id ?? '';

    await request(http)
      .post(`/applications/${appId}/submit`)
      .set(apiKey)
      .set('Authorization', `Bearer ${appTok}`)
      .expect(200);

    const jobCreated = await request(http)
      .post('/export-jobs')
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ groupId, status: 'in_review' })
      .expect(201);
    const jobId = (jobCreated.body as ExportJobBody).data?.id ?? '';
    expect((jobCreated.body as ExportJobBody).data?.status).toBe('completed');

    const job = await request(http)
      .get(`/export-jobs/${jobId}`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    expect((job.body as ExportJobBody).data?.status).toBe('completed');

    const download = await request(http)
      .get(`/export-jobs/${jobId}/download`)
      .set(apiKey)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);
    const csv = download.text;
    expect(csv).toContain('expense_title');
    expect(csv).toContain('amount');
    expect(csv).toContain('旅費精算');
    expect(csv).toContain('12000');
  });

  it('audit-logs: tenant_admin can read persisted audit entries', async () => {
    const http = app.getHttpServer();
    const apiKey = { 'X-API-Key': 'e2e-internal-api-key' };

    await request(http)
      .post('/auth/register')
      .set(apiKey)
      .send({ email: 'audit-admin@e2e.test', password: 'password12' })
      .expect(201);
    const login = await request(http)
      .post('/auth/login')
      .set(apiKey)
      .send({ email: 'audit-admin@e2e.test', password: 'password12' })
      .expect(200);
    const tok = (login.body as LoginJsonBody).data?.access_token ?? '';
    const adminUserId = await fetchMeId(http, apiKey, tok);
    const groupId = await createGroupForAdmin(
      http,
      apiKey,
      tok,
      adminUserId,
      'Audit Space',
    );

    await request(http)
      .get('/users')
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .expect(200);
    await request(http)
      .post('/form-definitions')
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .send({ groupId, name: 'Audit Form' })
      .expect(201);

    const logs = await request(http)
      .get('/audit-logs')
      .set(apiKey)
      .set('Authorization', `Bearer ${tok}`)
      .expect(200);
    const rows = (logs.body as AuditLogsListBody).data?.logs ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((x) => x.targetType === 'users')).toBe(true);
    expect(
      rows.some(
        (x) => x.targetType === 'form-definitions' && x.groupId === groupId,
      ),
    ).toBe(true);
  });
});
