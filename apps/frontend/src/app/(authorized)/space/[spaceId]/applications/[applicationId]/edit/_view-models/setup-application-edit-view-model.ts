import type { ApprovalStepItem } from "@/components/application-setup/approval-flow/approval-steps-builder";
import type { DraftField } from "@/components/application-setup/form-builder/application-setup-draft-form";
import { normalizeFieldOptions } from "@/components/applications/dynamic-fields/field-options";
import { FIELD_TYPES, isFieldType, type FieldType } from "@/lib/constants/form-fields";
import type {
  EditableApprovalFlow,
  EditableFormField,
  EditableGroupMember,
} from "../types";

export type ApprovalAssigneeOption = {
  id: string;
  label: string;
};

/**
 * スペースメンバーを承認担当者の選択肢に変換します。
 */
export function toApprovalAssigneeOptions(
  members: EditableGroupMember[],
): ApprovalAssigneeOption[] {
  return members.map((member) => ({
    id: member.userId,
    label: member.name ? `${member.name} (${member.email})` : member.email,
  }));
}

/**
 * 保存済みフォーム項目を下書きフォームビルダーの状態に変換します。
 */
export function toDraftFields(fields: EditableFormField[]): DraftField[] {
  return fields.map((field) => ({
    id: field.id,
    fieldKey: field.fieldKey,
    label: field.label,
    fieldType: asFieldType(field.fieldType),
    required: field.required,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    optionsText: optionsToText(field.options),
  }));
}

/**
 * 承認フローを承認ステップビルダーの状態に変換します。
 */
export function toInitialSteps(
  flow: EditableApprovalFlow | null,
): ApprovalStepItem[] {
  return (flow?.steps ?? []).map((step) => ({
    id: step.id,
    stepName: step.stepName,
    assigneeUserIds:
      step.assigneeUserIds && step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : step.assigneeUserId
          ? [step.assigneeUserId]
          : [],
    canReturn: step.canReturn,
  }));
}

/**
 * 未知のフィールド種別をフォームビルダーで扱える種別に変換します。
 */
function asFieldType(value: string): FieldType {
  return isFieldType(value) ? value : FIELD_TYPES.text;
}

/**
 * 選択肢オブジェクトを改行区切りの選択肢テキストに変換します。
 */
function optionsToText(options: unknown[] | null | undefined): string {
  return normalizeFieldOptions(options)
    .map((option) => option.label || option.value)
    .filter((option) => option.length > 0)
    .join("\n");
}
