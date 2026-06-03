import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app/app.module';
import { AuthService } from '../../app/modules/auth/auth.service';
import { ClientErrorCodes } from '../../common/errors';
import {
  configurePostgresTestEnv,
  truncatePostgresTables,
} from '../test-postgres';

describe('Auth (integration)', () => {
  let moduleRef: TestingModule;
  let auth: AuthService;

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'int-api-key';
    process.env.JWT_SECRET = 'int-jwt-secret-at-least-32-characters-long';
    configurePostgresTestEnv();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    auth = moduleRef.get(AuthService);
    await truncatePostgresTables(moduleRef.get(DataSource));
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('first user is admin; login accepts lowercased email; duplicate register conflicts', async () => {
    const reg = await auth.register({
      email: 'Admin@Int.test',
      password: 'password12',
    });
    expect(reg.user.role).toBe('admin');
    expect(reg.access_token.length).toBeGreaterThan(10);

    const viaLogin = await auth.login({
      email: 'admin@int.test',
      password: 'password12',
    });
    expect(viaLogin.user.email).toBe('admin@int.test');

    await expect(
      auth.register({ email: 'admin@int.test', password: 'password12' }),
    ).rejects.toMatchObject({ errorCode: ClientErrorCodes.AUTH_EMAIL_TAKEN });
  });

  it('second user is role user', async () => {
    await auth.register({
      email: 'first@int.test',
      password: 'password12',
    });
    const second = await auth.register({
      email: 'second@int.test',
      password: 'password12',
    });
    expect(second.user.role).toBe('user');
  });
});
