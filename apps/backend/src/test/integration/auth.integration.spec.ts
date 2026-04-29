import { Test, TestingModule } from '@nestjs/testing';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../../app/app.module';
import { AuthService } from '../../app/modules/auth/auth.service';
import { ClientErrorCodes } from '../../common/errors';
import { UserRole } from '../../models/constants/user-role';

describe('Auth (integration)', () => {
  let moduleRef: TestingModule;
  let auth: AuthService;
  const dbPath = join(__dirname, 'integration-auth.sqlite');

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'int-api-key';
    process.env.JWT_SECRET = 'int-jwt-secret-at-least-32-characters-long';
    process.env.DB_PATH = dbPath;
    process.env.MAIL_ENABLED = '0';
    try {
      rmSync(dbPath, { force: true });
    } catch {
      /* ignore */
    }
    mkdirSync(join(dbPath, '..'), { recursive: true });

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    auth = moduleRef.get(AuthService);
  });

  afterEach(async () => {
    await moduleRef.close();
    try {
      rmSync(dbPath, { force: true });
    } catch {
      /* ignore */
    }
  });

  it('register creates tenant_admin with tenantId; login accepts lowercased email; duplicate register conflicts', async () => {
    const reg = await auth.register({
      email: 'Admin@Int.test',
      password: 'password12',
    });
    expect(reg.user.role).toBe(UserRole.TENANT_ADMIN);
    expect(reg.user.tenantId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(reg.access_token.length).toBeGreaterThan(10);

    const viaLogin = await auth.login({
      email: 'admin@int.test',
      password: 'password12',
    });
    expect(viaLogin.user.email).toBe('admin@int.test');
    expect(viaLogin.user.tenantId).toBe(reg.user.tenantId);

    await expect(
      auth.register({ email: 'admin@int.test', password: 'password12' }),
    ).rejects.toMatchObject({ errorCode: ClientErrorCodes.AUTH_EMAIL_TAKEN });
  });

  it('second distinct email registers another tenant as tenant_admin', async () => {
    await auth.register({
      email: 'first@int.test',
      password: 'password12',
    });
    const second = await auth.register({
      email: 'second@int.test',
      password: 'password12',
    });
    expect(second.user.role).toBe(UserRole.TENANT_ADMIN);
    expect(second.user.tenantId).toBeTruthy();
  });
});
