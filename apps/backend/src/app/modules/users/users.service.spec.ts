import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
});
