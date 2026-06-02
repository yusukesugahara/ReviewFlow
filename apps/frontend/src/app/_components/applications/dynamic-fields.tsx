import {
  CheckboxFieldInput,
  RadioFieldInput,
  ScalarFieldInput,
  SelectFieldInput,
  TextareaFieldInput,
} from "./dynamic-field-inputs";
import type { ReactNode } from "react";
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
  readOnly = false,
  afterInput,
  variant = "default",
}: DynamicFieldInputProps) {
  const name = `field:${field.fieldKey}`;
  const options = normalizeFieldOptions(field.options);
  const stringValue =
    typeof value === "string" || typeof value === "number" ? String(value) : "";
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
    readOnly,
    afterInput,
    variant,
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

export function DynamicFieldsTable({
  fields,
  values,
  disabled = false,
  title = "申請書",
  renderValue,
  getRowClassName,
  getFieldError,
}: {
  fields: DynamicFormField[];
  values?: Record<string, unknown>;
  disabled?: boolean;
  title?: string;
  renderValue?: (field: DynamicFormField, value: unknown) => ReactNode;
  getRowClassName?: (field: DynamicFormField) => string | undefined;
  getFieldError?: (field: DynamicFormField) => string | undefined;
}) {
  return (
    <div className="overflow-hidden border border-slate-400 bg-white">
      <div className="border-b border-slate-400 bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-900">
        {title}
      </div>
      <div className="divide-y divide-slate-300">
        {fields.map((field, index) => {
          const value = values?.[field.fieldKey];
          const fieldError = getFieldError?.(field);
          return (
            <div
              key={field.id}
              className={`grid min-h-16 grid-cols-1 divide-y divide-slate-300 md:grid-cols-[200px_minmax(0,1fr)] md:divide-x md:divide-y-0 ${
                getRowClassName?.(field) ?? ""
              }`}
            >
              <div className="flex items-start gap-2 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800">
                <span className="mt-0.5 min-w-5 text-xs text-slate-500">{index + 1}</span>
                <span className="break-words">
                  {field.label}
                  {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                </span>
              </div>
              <div className="min-w-0 bg-white px-3 py-3">
                {renderValue ? (
                  renderValue(field, value)
                ) : (
                  <DynamicFieldInput
                    field={field}
                    value={value}
                    disabled={disabled}
                    afterInput={
                      fieldError ? (
                        <p className="text-sm font-medium text-red-700">{fieldError}</p>
                      ) : null
                    }
                    variant="table"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
