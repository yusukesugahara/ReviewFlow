import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ClientErrorCodes } from '../../../common/errors';
import { UserRole } from '../../../models/constants/user-role';
import { Tenant } from '../../../models/entities/tenant.entity';
import { User } from '../../../models/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findAllByEmail'>>;
  let jwt: { sign: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    users = {
      findAllByEmail: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed-jwt') };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('throws when email is already taken', async () => {
      users.findAllByEmail.mockResolvedValue([
        {
          id: 'u1',
          tenantId: 't1',
          email: 'a@b.com',
          passwordHash: 'h',
          role: UserRole.TENANT_ADMIN,
          name: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]);

      await expect(
        service.register({ email: 'a@b.com', password: 'password12' }),
      ).rejects.toMatchObject({ errorCode: ClientErrorCodes.AUTH_EMAIL_TAKEN });
    });

    it('creates tenant + platform_admin and signs JWT with tenantId', async () => {
      users.findAllByEmail.mockResolvedValue([]);
      const tenantRepo = {
        create: jest.fn((x: object) => ({ ...x })),
        save: jest.fn((t: Tenant) => {
          Object.assign(t, { id: 'tenant-1' });
          return Promise.resolve(t);
        }),
      };
      const userRepo = {
        create: jest.fn((x: object) => ({ ...x })),
        save: jest.fn((u: User) => {
          Object.assign(u, { id: 'id-admin' });
          return Promise.resolve(u);
        }),
      };

      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Tenant) {
            return tenantRepo;
          }
          if (entity === User) {
            return userRepo;
          }
          throw new Error('unexpected entity');
        },
      };

      dataSource.transaction.mockImplementation(
        async (fn: (m: typeof manager) => Promise<User>) => {
          return fn(manager);
        },
      );

      const out = await service.register({
        email: 'First@Example.com',
        password: 'password12',
      });

      expect(tenantRepo.save).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'id-admin',
        email: 'first@example.com',
        tenantId: 'tenant-1',
        role: UserRole.PLATFORM_ADMIN,
      });
      expect(out.user).toEqual({
        id: 'id-admin',
        email: 'first@example.com',
        role: UserRole.PLATFORM_ADMIN,
        tenantId: 'tenant-1',
      });
      expect(out.access_token).toBe('signed-jwt');
    });
  });

  describe('login', () => {
    it('throws when user does not exist', async () => {
      users.findAllByEmail.mockResolvedValue([]);
      await expect(
        service.login({ email: 'x@y.com', password: 'password12' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });

    it('throws when password does not match', async () => {
      const hash = await bcrypt.hash('correct', 4);
      users.findAllByEmail.mockResolvedValue([
        {
          id: 'u1',
          tenantId: 't1',
          email: 'a@b.com',
          passwordHash: hash,
          role: UserRole.APPLICANT,
          name: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrongpassword' }),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.AUTH_INVALID_CREDENTIALS,
      });
    });

    it('returns tokens when credentials are valid', async () => {
      const hash = await bcrypt.hash('password12', 4);
      users.findAllByEmail.mockResolvedValue([
        {
          id: 'u1',
          tenantId: 't1',
          email: 'a@b.com',
          passwordHash: hash,
          role: UserRole.APPLICANT,
          name: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User,
      ]);

      const out = await service.login({
        email: 'a@b.com',
        password: 'password12',
      });

      expect(out.access_token).toBe('signed-jwt');
      expect(out.user).toEqual({
        id: 'u1',
        email: 'a@b.com',
        role: UserRole.APPLICANT,
        tenantId: 't1',
      });
    });
  });
});
