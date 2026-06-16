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

export function toApprovalAssigneeOptions(
  members: EditableGroupMember[],
): ApprovalAssigneeOption[] {
  return members.map((member) => ({
    id: member.userId,
    label: member.name ? `${member.name} (${member.email})` : member.email,
  }));
}

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

function asFieldType(value: string): FieldType {
  return isFieldType(value) ? value : FIELD_TYPES.text;
}

function optionsToText(options: unknown[] | null | undefined): string {
  return normalizeFieldOptions(options)
    .map((option) => option.label || option.value)
    .filter((option) => option.length > 0)
    .join("\n");
}
