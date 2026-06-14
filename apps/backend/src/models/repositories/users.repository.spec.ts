import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { In, Not, Repository } from 'typeorm';
import { UserRole } from '../constants/user-role';
import { User } from '../entities/user.entity';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let users: jest.Mocked<
    Pick<Repository<User>, 'count' | 'findOne' | 'find' | 'save'>
  >;

  beforeEach(async () => {
    users = {
      count: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    repository = module.get(UsersRepository);
  });

  it('findAllByEmail queries lowercase email', async () => {
    users.find.mockResolvedValue([]);

    await repository.findAllByEmail('User@Example.COM');

    expect(users.find).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });

  it('findAllByEmailAndTenant queries lowercase email in the tenant', async () => {
    users.find.mockResolvedValue([]);

    await repository.findAllByEmailAndTenant('User@Example.COM', 'tenant-1');

    expect(users.find).toHaveBeenCalledWith({
      where: { email: 'user@example.com', tenantId: 'tenant-1' },
    });
  });

  it('findActiveByEmail queries active users with lowercase email', async () => {
    users.find.mockResolvedValue([]);

    await repository.findActiveByEmail('User@Example.COM');

    expect(users.find).toHaveBeenCalledWith({
      where: { email: 'user@example.com', isActive: true },
    });
  });

  it('emailExists checks lowercase email by count', async () => {
    users.count.mockResolvedValue(1);

    await expect(repository.emailExists('User@Example.COM')).resolves.toBe(
      true,
    );

    expect(users.count).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });

  it('emailExistsForAnotherUser excludes the current user by count', async () => {
    users.count.mockResolvedValue(0);

    await expect(
      repository.emailExistsForAnotherUser('User@Example.COM', 'user-1'),
    ).resolves.toBe(false);

    expect(users.count).toHaveBeenCalledWith({
      where: { email: 'user@example.com', id: Not('user-1') },
    });
  });

  it('findByTenantAndEmail queries lowercase email in tenant', async () => {
    users.findOne.mockResolvedValue(null);

    await repository.findByTenantAndEmail('tenant-1', 'User@Example.COM');

    expect(users.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', email: 'user@example.com' },
    });
  });

  it('countByIdsInTenant returns zero without querying for empty ids', async () => {
    await expect(repository.countByIdsInTenant('tenant-1', [])).resolves.toBe(
      0,
    );

    expect(users.count).not.toHaveBeenCalled();
  });

  it('countByIdsInTenant counts users in the tenant', async () => {
    users.count.mockResolvedValue(2);

    await expect(
      repository.countByIdsInTenant('tenant-1', ['user-1', 'user-2']),
    ).resolves.toBe(2);

    expect(users.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: In(['user-1', 'user-2']) },
    });
  });

  it('countTenantAdmins counts active tenant admins', async () => {
    users.count.mockResolvedValue(1);

    await repository.countTenantAdmins('tenant-1');

    expect(users.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        role: In([UserRole.TENANT_ADMIN]),
        isActive: true,
      },
    });
  });
});
