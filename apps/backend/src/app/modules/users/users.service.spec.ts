import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../models/entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<
    Pick<Repository<User>, 'count' | 'findOne' | 'create' | 'save'>
  >;

  beforeEach(async () => {
    repo = {
      count: jest.fn(),
      findOne: jest.fn(),
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

  it('findByEmail queries lowercase email', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.findByEmail('User@Example.COM');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });

  it('create persists lowercased email and default role', async () => {
    const entity: User = {
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'hash',
      role: 'user',
      createdAt: new Date(),
    };
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    await service.create('A@B.COM', 'hash');

    expect(repo.create).toHaveBeenCalledWith({
      email: 'a@b.com',
      passwordHash: 'hash',
      role: 'user',
    });
    expect(repo.save).toHaveBeenCalledWith(entity);
  });

  it('create respects explicit role', async () => {
    const entity: User = {
      id: 'u2',
      email: 'a@b.com',
      passwordHash: 'hash',
      role: 'admin',
      createdAt: new Date(),
    };
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    await service.create('a@b.com', 'hash', 'admin');

    expect(repo.create).toHaveBeenCalledWith({
      email: 'a@b.com',
      passwordHash: 'hash',
      role: 'admin',
    });
  });
});
