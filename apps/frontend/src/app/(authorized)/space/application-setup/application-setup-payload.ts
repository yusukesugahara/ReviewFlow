import type { DraftField } from "@/components/application-setup/application-setup-draft-form";
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
      fieldKey: normalizeFieldKey(label, index, usedKeys),
      label,
      fieldType: field.fieldType,
      required: fieldTypeStoresValue(field.fieldType) ? field.required : false,
      placeholder: field.placeholder.trim(),
      helpText: field.helpText.trim(),
      options: fieldTypeNeedsOptions(field.fieldType)
        ? parseOptions(field.optionsText)
        : [],
      sortOrder: index,
    };
  });
}

function parseOptions(optionsText: string): { label: string; value: string }[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index)
    .map((line) => ({ label: line, value: line }));
}

function normalizeFieldKey(
  label: string,
  index: number,
  usedKeys: Set<string>,
): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") || `field_${index + 1}`;
  let key = base;
  let suffix = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  usedKeys.add(key);
  return key;
}
