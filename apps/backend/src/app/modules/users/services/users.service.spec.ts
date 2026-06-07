import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes } from '../../../../common/errors';
import { UserRole } from '../../../../models/constants/user-role';
import { User } from '../../../../models/entities/user.entity';
import { UsersService } from './users.service';

/**
 * UsersService のテスト
 *
 * @group users-service
 */
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

  /**
   * count はリポジトリに委譲すること
   */
  it('count delegates to repository', async () => {
    repo.count.mockResolvedValue(3);
    await expect(service.count()).resolves.toBe(3);
  });

  /**
   * findAllByEmail は小文字のメールアドレスをクエリすること
   */
  it('findAllByEmail queries lowercase email', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAllByEmail('User@Example.COM');
    expect(repo.find).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });

  /**
   * findByTenantAndEmail は小文字のメールアドレスをクエリすること
   */
  it('findByTenantAndEmail queries lowercase email', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.findByTenantAndEmail('tenant-1', 'User@Example.COM');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', email: 'user@example.com' },
    });
  });

  describe('updateRoleInTenant', () => {
    /**
     * 自分のロールを変更しようとした場合にエラーを返すこと
     */
    it('forbids changing own role', async () => {
      await expect(
        service.updateRoleInTenant(
          't1',
          'same-id',
          UserRole.TENANT_USER,
          'same-id',
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.USER_ROLE_UPDATE_SELF_FORBIDDEN,
      });
    });

    /**
     * テナント内にユーザーがいない場合にエラーを返すこと
     */
    it('throws when user not in tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateRoleInTenant(
          't1',
          'missing',
          UserRole.TENANT_USER,
          'actor-id',
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.TENANT_USER_NOT_FOUND,
      });
    });

    /**
     * 最後のテナント管理者が降格されないように保護すること
     */
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
          UserRole.TENANT_USER,
          'actor-id',
        ),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.LAST_TENANT_ADMIN_PROTECTED,
      });
    });

    /**
     * テナント管理者に昇格できること
     */
    it('saves new role when allowed', async () => {
      const approver = {
        id: 'u-ap',
        tenantId: 't1',
        role: UserRole.TENANT_USER,
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
        UserRole.TENANT_USER,
        'actor-id',
      );

      expect(out.role).toBe(UserRole.TENANT_USER);
      expect(repo.save).toHaveBeenCalled();
    });

    /**
     * 他のユーザーをテナント管理者に昇格できること
     */
    it('allows promoting another user to tenant_admin', async () => {
      const approver = {
        id: 'u-ap',
        tenantId: 't1',
        role: UserRole.TENANT_USER,
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
        UserRole.TENANT_ADMIN,
        'actor-id',
      );

      expect(out.role).toBe(UserRole.TENANT_ADMIN);
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('deactivateInTenant', () => {
    /**
     * 自分のアカウントを削除しようとした場合にエラーを返すこと
     */
    it('forbids deleting own account', async () => {
      await expect(
        service.deactivateInTenant('t1', 'same-id', 'same-id'),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.USER_DELETE_SELF_FORBIDDEN,
      });
    });

    /**
     * テナント内にユーザーがいない場合にエラーを返すこと
     */
    it('throws when user not in tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.deactivateInTenant('t1', 'missing', 'actor-id'),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.TENANT_USER_NOT_FOUND,
      });
    });

    /**
     * 最後の有効なテナント管理者が削除されないように保護すること
     */
    it('protects the last active tenant_admin from deletion', async () => {
      repo.findOne.mockResolvedValue({
        id: 'u-admin',
        tenantId: 't1',
        role: UserRole.TENANT_ADMIN,
        isActive: true,
      } as User);
      repo.count.mockResolvedValue(1);

      await expect(
        service.deactivateInTenant('t1', 'u-admin', 'actor-id'),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.LAST_TENANT_ADMIN_PROTECTED,
      });
    });

    /**
     * 他のユーザーを削除できること
     */
    it('deactivates another user when allowed', async () => {
      const target = {
        id: 'u-member',
        tenantId: 't1',
        role: UserRole.TENANT_USER,
        isActive: true,
      } as User;
      repo.findOne.mockResolvedValue(target);
      repo.save.mockImplementation((u: User) => Promise.resolve(u));

      await service.deactivateInTenant('t1', 'u-member', 'actor-id');

      expect(target.isActive).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(target);
    });
  });

  describe('restoreInTenant', () => {
    /**
     * テナント内にユーザーがいない場合にエラーを返すこと
     */
    it('throws when user not in tenant', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.restoreInTenant('t1', 'missing'),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.TENANT_USER_NOT_FOUND,
      });
    });

    /**
     * ユーザーを復活できること
     */
    it('reactivates a user', async () => {
      const target = {
        id: 'u-member',
        tenantId: 't1',
        role: UserRole.TENANT_USER,
        isActive: false,
      } as User;
      repo.findOne.mockResolvedValue(target);
      repo.save.mockImplementation((u: User) => Promise.resolve(u));

      const out = await service.restoreInTenant('t1', 'u-member');

      expect(out.isActive).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(target);
    });
  });
});
