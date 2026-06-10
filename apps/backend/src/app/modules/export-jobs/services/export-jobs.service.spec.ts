import { Test, TestingModule } from '@nestjs/testing';
import { ClientErrorCodes } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { ExportJobStatus } from '../../../../models/constants/export-job-status';
import { Application } from '../../../../models/entities/application.entity';
import { ExportJob } from '../../../../models/entities/export-job.entity';
import { ExportJobsRepository } from '../../../../models/repositories/export-jobs.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import { ExportJobCsvBuilder } from './export-job-csv.builder';
import { ExportJobFileStorage } from './export-job-file-storage.service';
import { ExportJobsService } from './export-jobs.service';

describe('ExportJobsService', () => {
  let service: ExportJobsService;
  let exportJobsRepository: jest.Mocked<
    Pick<
      ExportJobsRepository,
      | 'createQueuedJob'
      | 'saveJob'
      | 'findExportableApplications'
      | 'findJobByIdInTenant'
    >
  >;
  let spaceAccess: jest.Mocked<
    Pick<SpaceAccessService, 'assertCanManageGroup'>
  >;
  let csvBuilder: jest.Mocked<Pick<ExportJobCsvBuilder, 'build'>>;
  let fileStorage: jest.Mocked<
    Pick<ExportJobFileStorage, 'writeCsv' | 'exists' | 'read'>
  >;

  const actor = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'admin@example.com',
    roles: ['tenant_admin'],
  };

  beforeEach(async () => {
    exportJobsRepository = {
      createQueuedJob: jest.fn(),
      saveJob: jest.fn(),
      findExportableApplications: jest.fn(),
      findJobByIdInTenant: jest.fn(),
    };
    spaceAccess = {
      assertCanManageGroup: jest.fn().mockResolvedValue(undefined),
    };
    csvBuilder = {
      build: jest.fn().mockReturnValue('csv-content'),
    };
    fileStorage = {
      writeCsv: jest.fn().mockReturnValue('/tmp/export.csv'),
      exists: jest.fn().mockReturnValue(true),
      read: jest.fn().mockReturnValue(Buffer.from('csv-content')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportJobsService,
        { provide: ExportJobsRepository, useValue: exportJobsRepository },
        { provide: SpaceAccessService, useValue: spaceAccess },
        { provide: ExportJobCsvBuilder, useValue: csvBuilder },
        { provide: ExportJobFileStorage, useValue: fileStorage },
      ],
    }).compile();

    service = module.get(ExportJobsService);
  });

  it('creates and completes a scoped CSV export job', async () => {
    const job = exportJob({ status: ExportJobStatus.QUEUED });
    const completed = exportJob({
      status: ExportJobStatus.COMPLETED,
      filePath: '/tmp/export.csv',
    });
    const savedSnapshots: Array<Pick<ExportJob, 'status' | 'filePath'>> = [];
    exportJobsRepository.createQueuedJob.mockResolvedValue(job);
    exportJobsRepository.saveJob.mockImplementation((saved) => {
      savedSnapshots.push({
        status: saved.status,
        filePath: saved.filePath,
      });
      return Promise.resolve(saved);
    });
    const rows = [application()];
    exportJobsRepository.findExportableApplications.mockResolvedValue(rows);
    exportJobsRepository.findJobByIdInTenant.mockResolvedValue(completed);

    const out = await service.create(actor, {
      groupId: 'group-1',
      status: ApplicationStatus.APPROVED,
      formDefinitionId: 'form-1',
    });

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(
      actor,
      'group-1',
    );
    expect(exportJobsRepository.createQueuedJob).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      requestedByUserId: 'user-1',
      filterJson: {
        status: ApplicationStatus.APPROVED,
        formDefinitionId: 'form-1',
      },
    });
    expect(
      exportJobsRepository.findExportableApplications,
    ).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      groupId: 'group-1',
      status: ApplicationStatus.APPROVED,
      formDefinitionId: 'form-1',
    });
    expect(csvBuilder.build).toHaveBeenCalledWith(rows);
    expect(fileStorage.writeCsv).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      jobId: 'job-1',
      csv: 'csv-content',
    });
    expect(savedSnapshots).toEqual([
      { status: ExportJobStatus.PROCESSING, filePath: null },
      { status: ExportJobStatus.COMPLETED, filePath: '/tmp/export.csv' },
    ]);
    expect(out.status).toBe(ExportJobStatus.COMPLETED);
  });

  it('marks the job failed when CSV generation fails', async () => {
    const job = exportJob({ status: ExportJobStatus.QUEUED });
    const failed = exportJob({ status: ExportJobStatus.FAILED });
    const savedStatuses: string[] = [];
    exportJobsRepository.createQueuedJob.mockResolvedValue(job);
    exportJobsRepository.saveJob.mockImplementation((saved) => {
      savedStatuses.push(saved.status);
      return Promise.resolve(saved);
    });
    exportJobsRepository.findExportableApplications.mockResolvedValue([
      application(),
    ]);
    csvBuilder.build.mockImplementation(() => {
      throw new Error('csv failed');
    });
    exportJobsRepository.findJobByIdInTenant.mockResolvedValue(failed);

    const out = await service.create(actor, { groupId: 'group-1' });

    expect(savedStatuses).toEqual([
      ExportJobStatus.PROCESSING,
      ExportJobStatus.FAILED,
    ]);
    expect(out.status).toBe(ExportJobStatus.FAILED);
  });

  it('getDownload returns CSV content for a completed job', async () => {
    exportJobsRepository.findJobByIdInTenant.mockResolvedValue(
      exportJob({
        status: ExportJobStatus.COMPLETED,
        filePath: '/tmp/export.csv',
      }),
    );

    const out = await service.getDownload(actor, 'job-1');

    expect(spaceAccess.assertCanManageGroup).toHaveBeenCalledWith(
      actor,
      'group-1',
    );
    expect(out.fileName).toBe('export-job-1.csv');
    expect(out.content.toString()).toBe('csv-content');
  });

  it('getDownload rejects non-completed jobs', async () => {
    exportJobsRepository.findJobByIdInTenant.mockResolvedValue(
      exportJob({ status: ExportJobStatus.PROCESSING, filePath: null }),
    );

    await expect(service.getDownload(actor, 'job-1')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.EXPORT_JOB_NOT_READY,
    });
  });

  it('getDownload rejects missing files', async () => {
    exportJobsRepository.findJobByIdInTenant.mockResolvedValue(
      exportJob({
        status: ExportJobStatus.COMPLETED,
        filePath: '/tmp/export.csv',
      }),
    );
    fileStorage.exists.mockReturnValue(false);

    await expect(service.getDownload(actor, 'job-1')).rejects.toMatchObject({
      errorCode: ClientErrorCodes.EXPORT_JOB_FILE_MISSING,
    });
  });
});

function exportJob(overrides: Partial<ExportJob> = {}): ExportJob {
  const date = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'job-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    requestedByUserId: 'user-1',
    status: ExportJobStatus.QUEUED,
    filterJson: null,
    filePath: null,
    startedAt: null,
    finishedAt: null,
    createdAt: date,
    ...overrides,
  } as ExportJob;
}

function application(overrides: Partial<Application> = {}): Application {
  const date = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'app-1',
    tenantId: 'tenant-1',
    groupId: 'group-1',
    applicantEmail: 'applicant@example.com',
    formDefinitionId: 'form-1',
    approvalFlowId: 'flow-1',
    currentStepOrder: null,
    status: ApplicationStatus.APPROVED,
    submittedAt: date,
    createdAt: date,
    updatedAt: date,
    fieldValues: [],
    ...overrides,
  } as Application;
}
