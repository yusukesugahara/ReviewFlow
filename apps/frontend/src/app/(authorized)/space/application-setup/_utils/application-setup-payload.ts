import {
  fieldOptionsFromText,
  normalizeFieldKey,
  type DraftField,
} from "@/components/application-setup/fields/application-setup-fields";
import {
  fieldTypeNeedsOptions,
  fieldTypeStoresValue,
  type FieldType,
} from "@/lib/constants/form-fields";
import type { ApprovalStepInput } from "./application-setup-form-parser";

export type FieldPayload = {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options: { label: string; value: string }[];
  sortOrder: number;
};

export type FieldRequest = Omit<FieldPayload, "options"> & {
  options?: ({} & { [key: string]: undefined })[];
};

export type ApprovalStepRequest = {
  stepOrder: number;
  stepName: string;
  assigneeUserId?: string;
  assigneeUserIds?: string[];
  canReturn: boolean;
};

export function toFieldRequest(field: FieldPayload): FieldRequest {
  return {
    ...field,
    options: field.options as unknown as ({} & { [key: string]: undefined })[],
  };
}

export function toApprovalStepRequest(
  steps: ApprovalStepInput[],
): ApprovalStepRequest[] {
  return steps.map((step) => ({
    stepOrder: step.stepOrder,
    stepName: step.stepName,
    assigneeUserId: step.assigneeUserId,
    assigneeUserIds: step.assigneeUserIds,
    canReturn: step.canReturn,
  }));
}

export function toFieldPayloads(fields: DraftField[]): FieldPayload[] {
  const usedKeys = new Set<string>();
  return fields.map((field, index) => {
    const label = field.label.trim() || `フォーム${index + 1}`;
    return {
      fieldKey: normalizeFieldKey(field, index, usedKeys),
      label,
      fieldType: field.fieldType,
      required: fieldTypeStoresValue(field.fieldType) ? field.required : false,
      placeholder: field.placeholder.trim(),
      helpText: field.helpText.trim(),
      options: fieldTypeNeedsOptions(field.fieldType)
        ? fieldOptionsFromText(field.optionsText)
        : [],
      sortOrder: index,
    };
  });
}
