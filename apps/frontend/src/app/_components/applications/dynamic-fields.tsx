import {
  CheckboxFieldInput,
  RadioFieldInput,
  ScalarFieldInput,
  SelectFieldInput,
  TextareaFieldInput,
} from "./dynamic-field-inputs";
import type { DynamicFieldInputProps, DynamicFormField } from "./dynamic-fields.types";
import { normalizeFieldOptions } from "./field-options";

export type { DynamicFormField } from "./dynamic-fields.types";

export function readDynamicValuesFromFormData(
  fields: DynamicFormField[],
  formData: FormData,
  editableFieldKeys?: Set<string>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (editableFieldKeys && !editableFieldKeys.has(field.fieldKey)) {
      continue;
    }
    const name = `field:${field.fieldKey}`;
    switch (field.fieldType) {
      case "number": {
        const raw = formData.get(name);
        if (typeof raw !== "string" || raw.trim().length === 0) {
          break;
        }
        const num = Number(raw);
        if (Number.isFinite(num)) {
          values[field.fieldKey] = num;
        }
        break;
      }
      case "checkbox": {
        const raw = formData.getAll(name);
        values[field.fieldKey] = raw.filter((x): x is string => typeof x === "string");
        break;
      }
      default: {
        const raw = formData.get(name);
        if (typeof raw === "string") {
          values[field.fieldKey] = raw;
        }
        break;
      }
    }
  }
  return values;
}

export function DynamicFieldInput({
  field,
  value,
  disabled = false,
  afterInput,
}: DynamicFieldInputProps) {
  const name = `field:${field.fieldKey}`;
  const options = normalizeFieldOptions(field.options);
  const stringValue = typeof value === "string" ? value : "";
  const selectedValues = Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
  const rendererProps = {
    field,
    name,
    stringValue,
    selectedValues,
    options,
    disabled,
    afterInput,
  };

  if (field.fieldType === "textarea") {
    return <TextareaFieldInput {...rendererProps} />;
  }

  if (field.fieldType === "select") {
    return <SelectFieldInput {...rendererProps} />;
  }

  if (field.fieldType === "radio") {
    return <RadioFieldInput {...rendererProps} />;
  }

  if (field.fieldType === "checkbox") {
    return <CheckboxFieldInput {...rendererProps} />;
  }

  return <ScalarFieldInput {...rendererProps} />;
}
