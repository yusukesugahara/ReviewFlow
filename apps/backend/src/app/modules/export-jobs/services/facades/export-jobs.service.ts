import { Injectable } from '@nestjs/common';
import type { AuthUserPayload } from '../../../../../decorators/current-user.decorator';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { ExportJobStatus } from '../../../../../models/constants/export-job-status';
import { ExportJobsRepository } from '../../../../../models/repositories/export-jobs.repository';
import { SpaceAccessService } from '../../../groups/services/access/space-access.service';
import type { CreateExportJobDto } from '../../dto/export-jobs.dto';
import { mapExportJobToDto } from '../../mappers/export-jobs.mapper';
import { ExportJobCsvBuilder } from '../csv/export-job-csv.builder';
import { ExportJobFileStorage } from '../storage/export-job-file-storage.service';

type CsvDownload = { fileName: string; content: Buffer };

/**
 * CSV エクスポートジョブの作成、状態取得、ダウンロードを扱う facade。
 */
@Injectable()
export class ExportJobsService {
  constructor(
    private readonly exportJobsRepository: ExportJobsRepository,
    private readonly spaceAccess: SpaceAccessService,
    private readonly csvBuilder: ExportJobCsvBuilder,
    private readonly fileStorage: ExportJobFileStorage,
  ) {}

  /**
   * space 管理権限を検証し、申請 CSV を生成するエクスポートジョブを作成する。
   * @param actor ログインユーザー
   * @param dto エクスポートジョブ作成DTO
   * @returns 作成後に再取得したエクスポートジョブDTO
   */
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

      const csv = this.csvBuilder.build(rows);
      const outputPath = this.fileStorage.writeCsv({
        tenantId: actor.tenantId,
        jobId: job.id,
        csv,
      });

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

  /**
   * エクスポートジョブを tenant / space scope で取得する。
   * @param actor ログインユーザー
   * @param id エクスポートジョブID
   * @returns エクスポートジョブDTO
   */
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

  /**
   * 完了済みエクスポートジョブの CSV ファイルを読み込む。
   * @param actor ログインユーザー
   * @param id エクスポートジョブID
   * @returns CSV ダウンロード内容
   */
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
    if (!row.filePath || !this.fileStorage.exists(row.filePath)) {
      throw clientError(ClientErrorCodes.EXPORT_JOB_FILE_MISSING);
    }
    return {
      fileName: `export-${row.id}.csv`,
      content: this.fileStorage.read(row.filePath),
    };
  }
}
