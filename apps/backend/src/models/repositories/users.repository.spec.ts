import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { In, Repository } from 'typeorm';
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

  it('findByTenantAndEmail queries lowercase email in tenant', async () => {
    users.findOne.mockResolvedValue(null);

    await repository.findByTenantAndEmail('tenant-1', 'User@Example.COM');

    expect(users.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', email: 'user@example.com' },
    });
  });

  it('findAllByIdsInTenant returns empty list without querying for empty ids', async () => {
    await expect(
      repository.findAllByIdsInTenant('tenant-1', []),
    ).resolves.toEqual([]);

    expect(users.find).not.toHaveBeenCalled();
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
