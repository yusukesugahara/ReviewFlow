import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../common/errors';
import { UserRole } from '../../../../models/constants/user-role';
import { User } from '../../../../models/entities/user.entity';
import { UsersRepository } from '../../../../models/repositories/users.repository';
import { UsersService } from './users.service';

/**
 * UsersService のテスト
 *
 * @group users-service
 */
describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<
    Pick<
      UsersRepository,
      | 'count'
      | 'findAllByEmail'
      | 'findByTenantAndEmail'
      | 'findByIdAndTenant'
      | 'countTenantAdmins'
      | 'save'
    >
  >;

  beforeEach(async () => {
    usersRepository = {
      count: jest.fn(),
      findAllByEmail: jest.fn(),
      findByTenantAndEmail: jest.fn(),
      findByIdAndTenant: jest.fn(),
      countTenantAdmins: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepository },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  /**
   * count はリポジトリに委譲すること
   */
  it('count delegates to repository', async () => {
    usersRepository.count.mockResolvedValue(3);
    await expect(service.count()).resolves.toBe(3);
  });

  /**
   * findAllByEmail は小文字のメールアドレスをクエリすること
   */
  it('findAllByEmail queries lowercase email', async () => {
    usersRepository.findAllByEmail.mockResolvedValue([]);
    await service.findAllByEmail('User@Example.COM');
    expect(usersRepository.findAllByEmail).toHaveBeenCalledWith(
      'User@Example.COM',
    );
  });

  /**
   * findByTenantAndEmail は小文字のメールアドレスをクエリすること
   */
  it('findByTenantAndEmail queries lowercase email', async () => {
    usersRepository.findByTenantAndEmail.mockResolvedValue(null);
    await service.findByTenantAndEmail('tenant-1', 'User@Example.COM');
    expect(usersRepository.findByTenantAndEmail).toHaveBeenCalledWith(
      'tenant-1',
      'User@Example.COM',
    );
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
     * テナント内にユーザがいない場合にエラーを返すこと
     */
    it('throws when user not in tenant', async () => {
      usersRepository.findByIdAndTenant.mockResolvedValue(null);
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
      usersRepository.findByIdAndTenant.mockResolvedValue(adminUser);
      usersRepository.countTenantAdmins.mockResolvedValue(1);

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
      usersRepository.findByIdAndTenant.mockResolvedValue(approver);
      usersRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      const out = await service.updateRoleInTenant(
        't1',
        'u-ap',
        UserRole.TENANT_USER,
        'actor-id',
      );

      expect(out.role).toBe(UserRole.TENANT_USER);
      expect(usersRepository.save).toHaveBeenCalled();
    });

    /**
     * 他のユーザをテナント管理者に昇格できること
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
      usersRepository.findByIdAndTenant.mockResolvedValue(approver);
      usersRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      const out = await service.updateRoleInTenant(
        't1',
        'u-ap',
        UserRole.TENANT_ADMIN,
        'actor-id',
      );

      expect(out.role).toBe(UserRole.TENANT_ADMIN);
      expect(usersRepository.save).toHaveBeenCalled();
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
     * テナント内にユーザがいない場合にエラーを返すこと
     */
    it('throws when user not in tenant', async () => {
      usersRepository.findByIdAndTenant.mockResolvedValue(null);
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
      usersRepository.findByIdAndTenant.mockResolvedValue({
        id: 'u-admin',
        tenantId: 't1',
        role: UserRole.TENANT_ADMIN,
        isActive: true,
      } as User);
      usersRepository.countTenantAdmins.mockResolvedValue(1);

      await expect(
        service.deactivateInTenant('t1', 'u-admin', 'actor-id'),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.LAST_TENANT_ADMIN_PROTECTED,
      });
    });

    /**
     * 他のユーザを削除できること
     */
    it('deactivates another user when allowed', async () => {
      const target = {
        id: 'u-member',
        tenantId: 't1',
        role: UserRole.TENANT_USER,
        isActive: true,
      } as User;
      usersRepository.findByIdAndTenant.mockResolvedValue(target);
      usersRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      await service.deactivateInTenant('t1', 'u-member', 'actor-id');

      expect(target.isActive).toBe(false);
      expect(usersRepository.save).toHaveBeenCalledWith(target);
    });
  });

  describe('restoreInTenant', () => {
    /**
     * テナント内にユーザがいない場合にエラーを返すこと
     */
    it('throws when user not in tenant', async () => {
      usersRepository.findByIdAndTenant.mockResolvedValue(null);
      await expect(
        service.restoreInTenant('t1', 'missing'),
      ).rejects.toMatchObject({
        errorCode: ClientErrorCodes.TENANT_USER_NOT_FOUND,
      });
    });

    /**
     * ユーザを復活できること
     */
    it('reactivates a user', async () => {
      const target = {
        id: 'u-member',
        tenantId: 't1',
        role: UserRole.TENANT_USER,
        isActive: false,
      } as User;
      usersRepository.findByIdAndTenant.mockResolvedValue(target);
      usersRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      const out = await service.restoreInTenant('t1', 'u-member');

      expect(out.isActive).toBe(true);
      expect(usersRepository.save).toHaveBeenCalledWith(target);
    });
  });
});
