import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { In, Not, Repository } from 'typeorm';
import { ApplicationStatus } from '../constants/application-status';
import { ExportJobStatus } from '../constants/export-job-status';
import { Application } from '../entities/application.entity';
import { ExportJob } from '../entities/export-job.entity';
import { ExportJobsRepository } from './export-jobs.repository';

describe('ExportJobsRepository', () => {
  let repository: ExportJobsRepository;
  let jobs: jest.Mocked<
    Pick<Repository<ExportJob>, 'create' | 'save' | 'findOne'>
  >;
  let applications: jest.Mocked<Pick<Repository<Application>, 'find'>>;

  beforeEach(async () => {
    jobs = {
      create: jest.fn((row: Partial<ExportJob>) => row as ExportJob),
      save: jest.fn((row: ExportJob) => Promise.resolve(row)),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<Repository<ExportJob>, 'create' | 'save' | 'findOne'>
    >;
    applications = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportJobsRepository,
        { provide: getRepositoryToken(ExportJob), useValue: jobs },
        { provide: getRepositoryToken(Application), useValue: applications },
      ],
    }).compile();

    repository = module.get(ExportJobsRepository);
  });

  it('creates queued export jobs', async () => {
    await repository.createQueuedJob({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      requestedByUserId: 'user-1',
      filterJson: { status: 'submitted' },
    });

    expect(jobs.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      requestedByUserId: 'user-1',
      status: ExportJobStatus.QUEUED,
      filterJson: { status: 'submitted' },
      filePath: null,
      startedAt: null,
      finishedAt: null,
    });
  });

  it('finds exportable applications with default status exclusion', async () => {
    applications.find.mockResolvedValue([]);

    await repository.findExportableApplications({
      tenantId: 'tenant-1',
      groupId: 'group-1',
    });

    expect(applications.find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        groupId: 'group-1',
        status: Not(In([ApplicationStatus.DRAFT, ApplicationStatus.PUBLISHED])),
      },
      relations: [
        'formDefinition',
        'formDefinition.fields',
        'fieldValues',
        'fieldValues.formField',
      ],
      order: { createdAt: 'ASC' },
    });
  });

  it('applies explicit export filters', async () => {
    applications.find.mockResolvedValue([]);

    await repository.findExportableApplications({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      status: ApplicationStatus.SUBMITTED,
      formDefinitionId: 'definition-1',
    });

    const call = applications.find.mock.calls[0]?.[0] as
      | { where?: Record<string, unknown> }
      | undefined;

    expect(call?.where).toMatchObject({
      status: ApplicationStatus.SUBMITTED,
      formDefinitionId: 'definition-1',
    });
  });
});
