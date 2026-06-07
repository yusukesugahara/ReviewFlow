import {
  CheckboxFieldInput,
  ConsentFieldInput,
  DescriptionFieldDisplay,
  RadioFieldInput,
  ScalarFieldInput,
  SelectFieldInput,
  SectionFieldDisplay,
  TextareaFieldInput,
} from "./dynamic-field-inputs";
import type { ReactNode } from "react";
import { z } from "zod";
import type { DynamicFieldInputProps, DynamicFormField } from "./dynamic-fields.types";
import { normalizeFieldOptions } from "./field-options";
import { fieldTypeStoresValue } from "@/lib/constants/form-fields";

export type { DynamicFormField } from "./dynamic-fields.types";

const stringArraySchema = z.array(z.string());
const scalarInputValueSchema = z.union([z.string(), z.number(), z.boolean()]);

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
  const scalarValue = scalarInputValueSchema.safeParse(value);
  const stringValue = scalarValue.success ? String(scalarValue.data) : "";
  const selectedValueResult = stringArraySchema.safeParse(value);
  const selectedValues = selectedValueResult.success ? selectedValueResult.data : [];
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

  if (field.fieldType === "consent") {
    return <ConsentFieldInput {...rendererProps} />;
  }

  if (field.fieldType === "description") {
    return <DescriptionFieldDisplay {...rendererProps} />;
  }

  if (field.fieldType === "section") {
    return <SectionFieldDisplay {...rendererProps} />;
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
          if (!fieldTypeStoresValue(field.fieldType)) {
            return (
              <div
                key={field.id}
                className={`bg-white px-3 py-3 ${
                  getRowClassName?.(field) ?? ""
                }`}
              >
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
            );
          }
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
