import type { ExportJob } from '../../../../models/entities/export-job.entity';
import type { ExportJobResponseDto } from '../dto/export-jobs.dto';

export function mapExportJobToDto(row: ExportJob): ExportJobResponseDto {
  return {
    id: row.id,
    groupId: row.groupId,
    status: row.status,
    filterJson: row.filterJson,
    filePath: row.filePath,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
