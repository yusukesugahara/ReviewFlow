import {
  FIELD_TYPES,
  fieldTypeNeedsOptions,
  fieldTypeStoresValue,
  type FieldType,
} from "@/lib/constants/form-fields";

export type DraftField = {
  id: string;
  fieldKey?: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  placeholder: string;
  helpText: string;
  optionsText: string;
};

export function createDefaultField(index: number): DraftField {
  return {
    id: `field-${index + 1}`,
    label: `フォーム${index + 1}`,
    fieldType: FIELD_TYPES.text,
    required: true,
    placeholder: "",
    helpText: "",
    optionsText: "",
  };
}

export function optionLines(optionsText: string): string[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index);
}

export function normalizeFieldKey(
  field: DraftField,
  index: number,
  usedKeys: Set<string>,
): string {
  const explicitKey = field.fieldKey?.trim();
  const base =
    explicitKey && /^[a-z0-9_]+$/.test(explicitKey)
      ? explicitKey
      : field.label
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

export function toDynamicField(
  field: DraftField,
  index: number,
  fieldKey: string,
) {
  const label = field.label.trim() || `フォーム${index + 1}`;
  return {
    id: field.id,
    fieldKey,
    label,
    fieldType: field.fieldType,
    required: fieldTypeStoresValue(field.fieldType) ? field.required : false,
    placeholder: field.placeholder.trim() || null,
    helpText: field.helpText.trim() || null,
    options: fieldTypeNeedsOptions(field.fieldType)
      ? optionLines(field.optionsText).map((option) => ({
          label: option,
          value: option,
        }))
      : [],
  };
}
