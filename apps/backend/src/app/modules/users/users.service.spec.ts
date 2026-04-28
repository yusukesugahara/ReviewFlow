import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes } from '../../../common/errors';
import { UserRole } from '../../../models/constants/user-role';
import { User } from '../../../models/entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<
    Pick<Repository<User>, 'count' | 'findOne' | 'find' | 'create' | 'save'>
  >;

  beforeEach(async () => {
    repo = {
      count: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('count delegates to repository', async () => {
    repo.count.mockResolvedValue(3);
    await expect(service.count()).resolves.toBe(3);
  });

  it('findAllByEmail queries lowercase email', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAllByEmail('User@Example.COM');
    expect(repo.find).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });

  it('findByTenantAndEmail queries lowercase email', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.findByTenantAndEmail('tenant-1', 'User@Example.COM');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', email: 'user@example.com' },
    });
  });

  describe('updateRoleInTenant', () => {
    it('forbids changing own role', async () => {
      await expect(
        service.updateRoleInTenant(
          't1',
          'same-id',
          UserRole.APPROVER,
          'same-id',
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.USER_ROLE_UPDATE_SELF_FORBIDDEN,
      });
    });

    it('throws when user not in tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateRoleInTenant(
          't1',
          'missing',
          UserRole.APPROVER,
          'actor-id',
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.TENANT_USER_NOT_FOUND,
      });
    });

    it('protects last tenant_admin from demotion', async () => {
      const adminUser = {
        id: 'u-admin',
        tenantId: 't1',
        role: UserRole.TENANT_ADMIN,
      } as User;
      repo.findOne.mockResolvedValue(adminUser);
      repo.count.mockResolvedValue(1);

      await expect(
        service.updateRoleInTenant(
          't1',
          'u-admin',
          UserRole.APPLICANT,
          'actor-id',
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.LAST_TENANT_ADMIN_PROTECTED,
      });
    });

    it('saves new role when allowed', async () => {
      const approver = {
        id: 'u-ap',
        tenantId: 't1',
        role: UserRole.APPROVER,
        email: 'a@b.com',
        name: null,
        isActive: true,
        createdAt: new Date(),
      } as User;
      repo.findOne.mockResolvedValue(approver);
      repo.save.mockImplementation((u: User) => Promise.resolve(u));

      const out = await service.updateRoleInTenant(
        't1',
        'u-ap',
        UserRole.APPLICANT,
        'actor-id',
      );

      expect(out.role).toBe(UserRole.APPLICANT);
      expect(repo.save).toHaveBeenCalled();
    });

    it('allows promoting another user to platform_admin', async () => {
      const approver = {
        id: 'u-ap',
        tenantId: 't1',
        role: UserRole.APPROVER,
        email: 'a@b.com',
        name: null,
        isActive: true,
        createdAt: new Date(),
      } as User;
      repo.findOne.mockResolvedValue(approver);
      repo.save.mockImplementation((u: User) => Promise.resolve(u));

      const out = await service.updateRoleInTenant(
        't1',
        'u-ap',
        UserRole.PLATFORM_ADMIN,
        'actor-id',
      );

      expect(out.role).toBe(UserRole.PLATFORM_ADMIN);
      expect(repo.save).toHaveBeenCalled();
    });
  });
});
