import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../app/app.module';
import { AuthService } from '../../app/modules/auth/services/auth.service';
import { InvitationsService } from '../../app/modules/invitations/services/invitations.service';
import { UsersService } from '../../app/modules/users/services/users.service';
import { ClientErrorCodes } from '../../common/errors';
import { InvitationStatus } from '../../models/constants/invitation-status';
import { UserRole } from '../../models/constants/user-role';
import { Invitation } from '../../models/entities/invitation.entity';
import {
  configurePostgresTestEnv,
  truncatePostgresTables,
} from '../test-postgres';

describe('Invitations (integration)', () => {
  let moduleRef: TestingModule;
  let auth: AuthService;
  let invitations: InvitationsService;
  let users: UsersService;

  beforeEach(async () => {
    process.env.INTERNAL_API_KEY = 'int-api-key';
    process.env.JWT_SECRET = 'int-jwt-secret-at-least-32-characters-long';
    configurePostgresTestEnv();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    auth = moduleRef.get(AuthService);
    invitations = moduleRef.get(InvitationsService);
    users = moduleRef.get(UsersService);
    await truncatePostgresTables(moduleRef.get(DataSource));
  });

  afterEach(async () => {
    await moduleRef?.close();
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
    expect(created).not.toHaveProperty('token');
    expect(created.email).toBe('member@int.test');

    const invitation = await moduleRef
      .get<Repository<Invitation>>(getRepositoryToken(Invitation))
      .findOne({
        where: {
          tenantId: reg.user.tenantId,
          email: 'member@int.test',
          status: InvitationStatus.PENDING,
        },
      });
    expect(invitation?.token.length).toBeGreaterThanOrEqual(32);

    const accepted = await invitations.accept({
      token: invitation?.token ?? '',
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
