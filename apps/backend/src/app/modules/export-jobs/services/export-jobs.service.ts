import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { Application } from '../../../../models/entities/application.entity';
import { ExportJobStatus } from '../../../../models/constants/export-job-status';
import { ExportJobsRepository } from '../../../../models/repositories/export-jobs.repository';
import { SpaceAccessService } from '../../groups/services/space-access.service';
import type { CreateExportJobDto } from '../dto/export-jobs.dto';
import { mapExportJobToDto } from '../mappers/export-jobs.mapper';

type CsvDownload = { fileName: string; content: Buffer };

@Injectable()
export class ExportJobsService {
  constructor(
    private readonly exportJobsRepository: ExportJobsRepository,
    private readonly spaceAccess: SpaceAccessService,
  ) {}

  private csvEscape(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    let text = '';
    if (typeof value === 'string') {
      text = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      text = String(value);
    } else {
      text = JSON.stringify(value);
    }
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private buildCsv(rows: Application[]): string {
    const baseColumns = [
      'applicationId',
      'status',
      'submittedAt',
      'createdAt',
      'updatedAt',
      'applicantEmail',
      'formDefinitionName',
      'approvalFlowId',
      'currentStepOrder',
    ];

    const fieldKeys = new Set<string>();
    for (const row of rows) {
      for (const f of row.formDefinition?.fields ?? []) {
        fieldKeys.add(f.fieldKey);
      }
    }
    const dynamicColumns = [...fieldKeys].sort((a, b) => a.localeCompare(b));
    const columns = [...baseColumns, ...dynamicColumns];

    const lines: string[] = [columns.map((c) => this.csvEscape(c)).join(',')];

    for (const row of rows) {
      const valuesByKey = new Map<string, unknown>();
      for (const v of row.fieldValues ?? []) {
        const key = v.formField?.fieldKey;
        if (key) {
          valuesByKey.set(key, v.valueJson);
        }
      }

      const record: unknown[] = [
        row.id,
        row.status,
        row.submittedAt ? row.submittedAt.toISOString() : '',
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
        row.applicantEmail,
        row.formDefinition?.name ?? '',
        row.approvalFlowId,
        row.currentStepOrder ?? '',
      ];
      for (const key of dynamicColumns) {
        record.push(valuesByKey.has(key) ? valuesByKey.get(key) : '');
      }
      lines.push(record.map((v) => this.csvEscape(v)).join(','));
    }

    return `${lines.join('\n')}\n`;
  }

  private buildOutputPath(tenantId: string, jobId: string): string {
    return join(process.cwd(), 'var', 'exports', tenantId, `${jobId}.csv`);
  }

  async create(actor: AuthUserPayload, dto: CreateExportJobDto) {
    await this.spaceAccess.assertCanManageGroup(actor, dto.groupId);
    const filterJson: Record<string, unknown> = {};
    if (dto.status) {
      filterJson.status = dto.status;
    }
    if (dto.formDefinitionId) {
      filterJson.formDefinitionId = dto.formDefinitionId;
    }

    const job = await this.exportJobsRepository.createQueuedJob({
      tenantId: actor.tenantId,
      groupId: dto.groupId,
      requestedByUserId: actor.id,
      filterJson: Object.keys(filterJson).length ? filterJson : null,
    });

    try {
      job.status = ExportJobStatus.PROCESSING;
      job.startedAt = new Date();
      await this.exportJobsRepository.saveJob(job);

      const rows = await this.exportJobsRepository.findExportableApplications({
        tenantId: actor.tenantId,
        groupId: dto.groupId,
        status: dto.status,
        formDefinitionId: dto.formDefinitionId,
      });

      const csv = this.buildCsv(rows);
      const outputPath = this.buildOutputPath(actor.tenantId, job.id);
      mkdirSync(join(outputPath, '..'), { recursive: true });
      writeFileSync(outputPath, csv, 'utf8');

      job.status = ExportJobStatus.COMPLETED;
      job.filePath = outputPath;
      job.finishedAt = new Date();
      await this.exportJobsRepository.saveJob(job);
    } catch {
      job.status = ExportJobStatus.FAILED;
      job.finishedAt = new Date();
      await this.exportJobsRepository.saveJob(job);
    }

    return this.getOne(actor, job.id);
  }

  async getOne(actor: AuthUserPayload, id: string) {
    const row = await this.exportJobsRepository.findJobByIdInTenant(
      actor.tenantId,
      id,
    );
    if (!row) {
      throw clientError(ClientErrorCodes.EXPORT_JOB_NOT_FOUND);
    }
    await this.spaceAccess.assertCanManageGroup(actor, row.groupId);
    return mapExportJobToDto(row);
  }

  async getDownload(actor: AuthUserPayload, id: string): Promise<CsvDownload> {
    const row = await this.exportJobsRepository.findJobByIdInTenant(
      actor.tenantId,
      id,
    );
    if (!row) {
      throw clientError(ClientErrorCodes.EXPORT_JOB_NOT_FOUND);
    }
    await this.spaceAccess.assertCanManageGroup(actor, row.groupId);
    if (row.status !== ExportJobStatus.COMPLETED) {
      throw clientError(ClientErrorCodes.EXPORT_JOB_NOT_READY);
    }
    if (!row.filePath || !existsSync(row.filePath)) {
      throw clientError(ClientErrorCodes.EXPORT_JOB_FILE_MISSING);
    }
    return {
      fileName: `export-${row.id}.csv`,
      content: readFileSync(row.filePath),
    };
  }
}
