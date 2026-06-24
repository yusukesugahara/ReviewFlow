import { FIELD_TYPES } from "@/lib/constants/form-fields";
import type { ApprovalStepItem } from "../approval-flow/approval-steps.types";
import type { DraftField } from "../fields/application-setup-fields";

export type SetupProgress = {
  completedCount: number;
  percent: number;
  totalCount: number;
};

const defaultFieldLabelPattern = /^フォーム\d+$/;
const defaultApprovalStepNamePattern = /^(一次承認|最終承認|承認ステップ\d+)$/;

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isConfiguredDraftField(field: DraftField): boolean {
  const hasCustomLabel =
    hasText(field.label) && !defaultFieldLabelPattern.test(field.label.trim());

  return (
    hasCustomLabel ||
    field.fieldType !== FIELD_TYPES.text ||
    field.required !== true ||
    hasText(field.placeholder) ||
    hasText(field.helpText) ||
    hasText(field.optionsText)
  );
}

function isConfiguredApprovalStep(step: ApprovalStepItem): boolean {
  const hasCustomStepName =
    hasText(step.stepName) &&
    !defaultApprovalStepNamePattern.test(step.stepName.trim());

  return hasCustomStepName || step.assigneeUserIds.length > 0;
}

/**
 * セットアップ全体の入力状況を上部サマリー用に集計します。
 */
export function buildSetupProgress({
  approvalSteps,
  fields,
  formName,
  isPublished,
}: {
  approvalSteps: ApprovalStepItem[];
  fields: DraftField[];
  formName: string;
  isPublished: boolean;
}): SetupProgress {
  if (isPublished) {
    return {
      completedCount: 5,
      percent: 100,
      totalCount: 5,
    };
  }

  const configuredFields = fields.filter(isConfiguredDraftField);
  const hasConfiguredFields = configuredFields.length > 0;
  const milestones = [
    hasText(formName),
    hasConfiguredFields,
    hasConfiguredFields && configuredFields.every((field) => hasText(field.label)),
    approvalSteps.some(isConfiguredApprovalStep),
    approvalSteps.some((step) => step.assigneeUserIds.length > 0),
  ];
  const completedCount = milestones.filter(Boolean).length;
  const totalCount = milestones.length;

  return {
    completedCount,
    percent: Math.round((completedCount / totalCount) * 100),
    totalCount,
  };
}

/**
 * 申請フォームの保存状態を表示ラベルに変換します。
 */
export function setupStatusLabel({
  initialName,
  publishedFormDefinitionId,
}: {
  initialName?: string;
  publishedFormDefinitionId?: string | null;
}) {
  if (publishedFormDefinitionId) {
    return "公開済み";
  }
  if (initialName?.trim()) {
    return "下書き";
  }
  return "未保存";
}
