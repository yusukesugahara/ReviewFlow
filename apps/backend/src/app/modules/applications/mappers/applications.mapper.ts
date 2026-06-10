import type { Application } from '../../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import type {
  ApplicationDetailDto,
  ApplicationProgressStepDto,
  ApplicationSummaryDto,
  CorrectionTargetsResponseDto,
  CorrectionRequestItemResponseDto,
  CorrectionRequestResponseDto,
  CorrectionsListResponseDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';

export type ApplicationWithProgress = Application & {
  approvalProgress?: ApplicationProgressStepDto[];
};

export function mapApplicationToSummary(
  row: Application,
): ApplicationSummaryDto {
  const applicationName = row.formDefinition?.name ?? '';
  const currentStepAssigneeUserIds = getCurrentStepAssigneeUserIds(row);
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
    currentStepAssigneeUserIds,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getCurrentStepAssigneeUserIds(row: Application): string[] {
  if (row.currentStepOrder == null) {
    return [];
  }
  const step = (row.approvalFlow?.steps ?? []).find(
    (s) => s.stepOrder === row.currentStepOrder,
  );
  if (!step) {
    return [];
  }
  return step.assigneeUserIds && step.assigneeUserIds.length > 0
    ? step.assigneeUserIds
    : [step.assigneeUserId];
}

export function mapApplicationToDetail(
  row: ApplicationWithProgress,
): ApplicationDetailDto {
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
    approvalProgress: row.approvalProgress ?? [],
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

export function mapCorrectionTargetsResponse(
  app: Application,
  openCorrection: CorrectionRequest | null,
): CorrectionTargetsResponseDto {
  if (!openCorrection) {
    return {
      applicationId: app.id,
      applicationStatus: app.status,
      openCorrection: null,
    };
  }

  const valueByFieldId = new Map(
    (app.fieldValues ?? []).map((value) => [
      value.formFieldId,
      value.valueJson,
    ]),
  );

  return {
    applicationId: app.id,
    applicationStatus: app.status,
    openCorrection: {
      id: openCorrection.id,
      overallComment: openCorrection.overallComment,
      createdAt: openCorrection.createdAt.toISOString(),
      items: (openCorrection.items ?? []).map((item) => {
        const field = item.formField;
        return {
          itemId: item.id,
          formFieldId: item.formFieldId,
          fieldKey: field?.fieldKey ?? '',
          label: field?.label ?? '',
          fieldType: field?.fieldType ?? '',
          required: field?.required ?? false,
          comment: item.comment,
          currentValue: valueByFieldId.has(item.formFieldId)
            ? valueByFieldId.get(item.formFieldId)
            : null,
        };
      }),
    },
  };
}

export function mapCorrectionToReturnApplicationDto(
  openCorrection: CorrectionRequest,
): ReturnApplicationDto {
  return {
    overallComment: openCorrection.overallComment ?? undefined,
    fields: (openCorrection.items ?? []).map((item) => ({
      fieldId: item.formFieldId,
      comment: item.comment ?? undefined,
    })),
  };
}
