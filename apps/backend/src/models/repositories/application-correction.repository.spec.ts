import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager, Repository } from 'typeorm';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { CorrectionRequest } from '../entities/correction-request.entity';
import { ApplicationCorrectionRepository } from './application-correction.repository';

describe('ApplicationCorrectionRepository', () => {
  let repository: ApplicationCorrectionRepository;
  let correctionRequests: jest.Mocked<
    Pick<Repository<CorrectionRequest>, 'find' | 'findOne'>
  >;

  beforeEach(async () => {
    correctionRequests = { find: jest.fn(), findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationCorrectionRepository,
        {
          provide: getRepositoryToken(CorrectionRequest),
          useValue: correctionRequests,
        },
      ],
    }).compile();

    repository = module.get(ApplicationCorrectionRepository);
  });

  it('finds open correction requests with items', async () => {
    correctionRequests.findOne.mockResolvedValue(null);

    await repository.findOpenCorrection({
      tenantId: 'tenant-1',
      applicationId: 'app-1',
    });

    expect(correctionRequests.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        applicationId: 'app-1',
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
  });

  it('uses the transaction manager when finding open correction requests', async () => {
    const managerRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const getRepository = jest.fn().mockReturnValue(managerRepository);
    const manager = {
      getRepository,
    } as unknown as EntityManager;

    await repository.findOpenCorrection(
      {
        tenantId: 'tenant-1',
        applicationId: 'app-1',
      },
      manager,
    );

    expect(getRepository).toHaveBeenCalledWith(CorrectionRequest);
    expect(managerRepository.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        applicationId: 'app-1',
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items'],
    });
    expect(correctionRequests.findOne).not.toHaveBeenCalled();
  });

  it('lists correction requests with item fields', async () => {
    correctionRequests.find.mockResolvedValue([]);

    await repository.listCorrections('tenant-1', 'app-1');

    expect(correctionRequests.find).toHaveBeenCalledWith({
      where: { applicationId: 'app-1', tenantId: 'tenant-1' },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
  });

  it('returns the latest open correction with item fields', async () => {
    const latest = { id: 'correction-latest' } as CorrectionRequest;
    correctionRequests.findOne.mockResolvedValue(latest);

    await expect(
      repository.findLatestOpenCorrectionWithItems('tenant-1', 'app-1'),
    ).resolves.toBe(latest);

    expect(correctionRequests.findOne).toHaveBeenCalledWith({
      where: {
        applicationId: 'app-1',
        tenantId: 'tenant-1',
        status: CorrectionRequestStatus.OPEN,
      },
      relations: ['items', 'items.formField'],
      order: { createdAt: 'DESC' },
    });
  });
});
