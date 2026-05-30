import type { Application } from '../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../models/entities/correction-request.entity';
import type {
  ApplicationDetailDto,
  ApplicationSummaryDto,
  CorrectionRequestItemResponseDto,
  CorrectionRequestResponseDto,
  CorrectionsListResponseDto,
} from './applications.dto';

export function mapApplicationToSummary(
  row: Application,
): ApplicationSummaryDto {
  const applicationName = row.formDefinition?.name ?? '';
  return {
    id: row.id,
    groupId: row.groupId,
    status: row.status,
    approvalFlowId: row.approvalFlowId,
    formDefinitionId: row.formDefinitionId,
    formDefinitionName: applicationName,
    applicationName,
    applicantEmail: row.applicantEmail,
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
  const currentStep =
    row.currentStepOrder == null
      ? null
      : (row.approvalFlow?.steps ?? []).find(
          (step) => step.stepOrder === row.currentStepOrder,
        );
  return {
    ...mapApplicationToSummary(row),
    currentStepCanReturn: currentStep?.canReturn ?? null,
    values,
  };
}

function mapCorrectionItem(
  row: NonNullable<CorrectionRequest['items']>[number],
): CorrectionRequestItemResponseDto {
  return {
    id: row.id,
    formFieldId: row.formFieldId,
    fieldKey: row.formField?.fieldKey ?? '',
    comment: row.comment,
    isResolved: row.isResolved,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapCorrectionRequestToDto(
  row: CorrectionRequest,
): CorrectionRequestResponseDto {
  const items = [...(row.items ?? [])].map(mapCorrectionItem);
  return {
    id: row.id,
    status: row.status,
    overallComment: row.overallComment,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    items,
  };
}

export function mapCorrectionsList(
  rows: CorrectionRequest[],
): CorrectionsListResponseDto {
  const sorted = [...rows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return { corrections: sorted.map(mapCorrectionRequestToDto) };
}
