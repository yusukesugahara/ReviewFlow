import type { CorrectionTargetItem, EditableFormField } from "../types";

export type ReturnedCorrectionFormModel = {
  targetByFieldId: Map<string, CorrectionTargetItem>;
  targetFields: Array<EditableFormField & { required: boolean }>;
  values: Record<string, unknown>;
};

export function buildReturnedCorrectionFormModel({
  fields,
  targets,
}: {
  fields: EditableFormField[];
  targets: CorrectionTargetItem[];
}): ReturnedCorrectionFormModel {
  const targetByFieldId = new Map(
    targets.map((target) => [target.formFieldId, target]),
  );

  return {
    targetByFieldId,
    targetFields: fields
      .filter((field) => targetByFieldId.has(field.id))
      .map((field) => ({
        ...field,
        required: field.required ?? false,
      })),
    values: Object.fromEntries(
      targets.map((target) => [target.fieldKey, target.currentValue]),
    ),
  };
}
