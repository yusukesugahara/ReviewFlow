import type { ReactNode } from "react";

export type DynamicFormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
};

export type FieldOption = {
  value: string;
  label: string;
};

export type DynamicFieldInputProps = {
  field: DynamicFormField;
  value: unknown;
  disabled?: boolean;
  afterInput?: ReactNode;
  variant?: "default" | "table";
};

export type DynamicFieldRendererProps = Omit<DynamicFieldInputProps, "value"> & {
  name: string;
  stringValue: string;
  selectedValues: string[];
  options: FieldOption[];
};
