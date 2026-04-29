import { Test, TestingModule } from '@nestjs/testing';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../../app/app.module';
import { AuthService } from '../../app/modules/auth/auth.service';
import { InvitationsService } from '../../app/modules/invitations/invitations.service';
import { UsersService } from '../../app/modules/users/users.service';
import { ClientErrorCodes } from '../../common/errors';
import { UserRole } from '../../models/constants/user-role';

describe('Invitations (integration)', () => {
  let moduleRef: TestingModule;
  let auth: AuthService;
  let invitations: InvitationsService;
  let users: UsersService;
  const dbPath = join(__dirname, 'integration-invitations.sqlite');

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
    invitations = moduleRef.get(InvitationsService);
    users = moduleRef.get(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
    try {
      rmSync(dbPath, { force: true });
    } catch {
      /* ignore */
    }
  });

  it('system admin creates invitation; accept creates user and returns JWT', async () => {
    const reg = await auth.register({
      email: 'admin-inv@int.test',
      password: 'password12',
    });
    const actor = {
      id: reg.user.id,
      email: reg.user.email,
      tenantId: reg.user.tenantId,
      roles: [reg.user.role],
    };

    const created = await invitations.create(
      { email: 'Member@Int.test', role: UserRole.TENANT_USER },
      actor,
    );
    expect(created.token.length).toBeGreaterThanOrEqual(32);
    expect(created.email).toBe('member@int.test');

    const accepted = await invitations.accept({
      token: created.token,
      name: 'Member User',
      password: 'password12',
    });
    expect(accepted.user.email).toBe('member@int.test');
    expect(accepted.user.role).toBe(UserRole.TENANT_USER);

    const member = await users.findByTenantAndEmail(
      reg.user.tenantId,
      'member@int.test',
    );
    expect(member?.name).toBe('Member User');
  });

  it('rejects second pending invitation for the same email in tenant', async () => {
    const reg = await auth.register({
      email: 'admin2-inv@int.test',
      password: 'password12',
    });
    const actor = {
      id: reg.user.id,
      email: reg.user.email,
      tenantId: reg.user.tenantId,
      roles: [reg.user.role],
    };

    await invitations.create(
      { email: 'dup@int.test', role: UserRole.TENANT_USER },
      actor,
    );

    await expect(
      invitations.create(
        { email: 'dup@int.test', role: UserRole.TENANT_USER },
        actor,
      ),
    ).rejects.toMatchObject({
      errorCode: ClientErrorCodes.INVITATION_PENDING_EXISTS,
    });
  });
});
