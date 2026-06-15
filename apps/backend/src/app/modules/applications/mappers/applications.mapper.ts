import type { Application } from '../../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import type {
  ApplicationCapabilitiesDto,
  ApplicationDetailDto,
  ApplicationProgressStepDto,
  ApplicationSummaryDto,
  CorrectionTargetsResponseDto,
  CorrectionRequestItemResponseDto,
  CorrectionRequestResponseDto,
  CorrectionsListResponseDto,
  ReturnApplicationEmailDto,
} from '../dto/applications.dto';

export type ApplicationWithProgress = Application & {
  approvalProgress?: ApplicationProgressStepDto[];
};

/**
 * 申請機能の無効化を表すDTOを返す。
 * @returns 申請機能の無効化を表すDTO
 */
export function disabledApplicationCapabilities(): ApplicationCapabilitiesDto {
  return {
    canEditApplication: false,
    canSubmitApplication: false,
    canResubmitApplication: false,
    canApproveApplication: false,
    canRejectApplication: false,
    canReturnApplication: false,
  };
}

/**
 * 申請を概要DTOにマッピングする。
 * @param row 申請
 * @returns 申請概要DTO
 */
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

/**
 * 現在の承認ステップ担当者のユーザID一覧を取得する。
 * @param row 申請
 * @returns 現在の承認ステップ担当者のユーザID一覧
 */
function getCurrentStepAssigneeUserIds(row: Application): string[] {
  const step = row.currentApprovalStep ?? null;
  if (!step) {
    return [];
  }
  return step.assigneeUserIds && step.assigneeUserIds.length > 0
    ? step.assigneeUserIds
    : [step.assigneeUserId];
}

/**
 * 申請を詳細DTOにマッピングする。
 * @param row 申請
 * @param capabilities 申請機能の有効化を表すDTO
 * @returns 申請詳細DTO
 */
export function mapApplicationToDetail(
  row: ApplicationWithProgress,
  capabilities: ApplicationCapabilitiesDto = disabledApplicationCapabilities(),
): ApplicationDetailDto {
  const values: Record<string, unknown> = {};
  for (const v of row.fieldValues ?? []) {
    const key = v.formField?.fieldKey;
    if (key) {
      values[key] = v.valueJson;
    }
  }
  const currentStep = row.currentApprovalStep ?? null;
  return {
    ...mapApplicationToSummary(row),
    capabilities,
    currentStepCanReturn: currentStep?.canReturn ?? null,
    approvalProgress: row.approvalProgress ?? [],
    values,
  };
}

/**
 * 修正項目をDTOにマッピングする。
 * @param row 修正項目
 * @returns 修正項目DTO
 */
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

/**
 * 修正リクエストをDTOにマッピングする。
 * @param row 修正リクエスト
 * @returns 修正リクエストDTO
 */
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

/**
 * 修正リクエストをDTOにマッピングする。
 * @param rows 修正リクエスト
 * @returns 修正リクエストDTO
 */
export function mapCorrectionsList(
  rows: CorrectionRequest[],
): CorrectionsListResponseDto {
  const sorted = [...rows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return { corrections: sorted.map(mapCorrectionRequestToDto) };
}

/**
 * 修正リクエストをDTOにマッピングする。
 * @param app 申請
 * @param openCorrection オープンな修正リクエスト
 * @returns 修正リクエストDTO
 */
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

/**
 * 修正リクエストをDTOにマッピングする。
 * @param openCorrection オープンな修正リクエスト
 * @returns 修正リクエストDTO
 */
export function mapCorrectionToReturnApplicationDto(
  openCorrection: CorrectionRequest,
): ReturnApplicationEmailDto {
  return {
    overallComment: openCorrection.overallComment ?? undefined,
    fields: (openCorrection.items ?? []).map((item) => ({
      fieldId: item.formFieldId,
      comment: item.comment ?? undefined,
    })),
  };
}
