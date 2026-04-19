import type { Application } from '../../../models/entities/application.entity';
import type {
  ApplicationDetailDto,
  ApplicationSummaryDto,
} from './applications.dto';

export function mapApplicationToSummary(row: Application): ApplicationSummaryDto {
  return {
    id: row.id,
    status: row.status,
    formTemplateId: row.formTemplateId,
    approvalFlowId: row.approvalFlowId,
    applicantUserId: row.applicantUserId,
    currentStepOrder: row.currentStepOrder,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapApplicationToDetail(row: Application): ApplicationDetailDto {
  const values: Record<string, unknown> = {};
  for (const v of row.fieldValues ?? []) {
    const key = v.formField?.fieldKey;
    if (key) {
      values[key] = v.valueJson;
    }
  }
  return {
    ...mapApplicationToSummary(row),
    values,
  };
}
