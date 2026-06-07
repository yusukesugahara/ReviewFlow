import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { ApplicationStatus } from '../constants/application-status';
import { ExportJobStatus } from '../constants/export-job-status';
import { Application } from '../entities/application.entity';
import { ExportJob } from '../entities/export-job.entity';

@Injectable()
export class ExportJobsRepository {
  constructor(
    @InjectRepository(ExportJob)
    private readonly jobs: Repository<ExportJob>,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
  ) {}

  createQueuedJob(params: {
    tenantId: string;
    groupId: string;
    requestedByUserId: string;
    filterJson: Record<string, unknown> | null;
  }): Promise<ExportJob> {
    return this.jobs.save(
      this.jobs.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        requestedByUserId: params.requestedByUserId,
        status: ExportJobStatus.QUEUED,
        filterJson: params.filterJson,
        filePath: null,
        startedAt: null,
        finishedAt: null,
      }),
    );
  }

  saveJob(job: ExportJob): Promise<ExportJob> {
    return this.jobs.save(job);
  }

  findExportableApplications(params: {
    tenantId: string;
    groupId: string;
    status?: string;
    formDefinitionId?: string;
  }): Promise<Application[]> {
    const where: Record<string, unknown> = {
      tenantId: params.tenantId,
      groupId: params.groupId,
      status: Not(In([ApplicationStatus.DRAFT, ApplicationStatus.PUBLISHED])),
    };
    if (params.status) {
      where.status = params.status;
    }
    if (params.formDefinitionId) {
      where.formDefinitionId = params.formDefinitionId;
    }

    return this.applications.find({
      where,
      relations: [
        'formDefinition',
        'formDefinition.fields',
        'fieldValues',
        'fieldValues.formField',
      ],
      order: { createdAt: 'ASC' },
    });
  }

  findJobByIdInTenant(tenantId: string, id: string): Promise<ExportJob | null> {
    return this.jobs.findOne({
      where: { id, tenantId },
    });
  }
}
