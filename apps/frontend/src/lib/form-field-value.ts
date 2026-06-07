import { z } from "zod";
import { normalizeFieldOptions } from "@/components/applications/field-options";

export type FieldOption = { value: string; label: string };

export type DisplayableFormField = {
  fieldType: string;
  options?: unknown[] | null;
};

export { normalizeFieldOptions };

const stringArraySchema = z.array(z.string());
const scalarDisplayValueSchema = z.union([z.string(), z.number()]);

export function renderFieldValue(field: DisplayableFormField, value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (field.fieldType === "checkbox") {
    const values = stringArraySchema.safeParse(value);
    if (!values.success) {
      return "-";
    }
    const opts = normalizeFieldOptions(field.options);
    if (opts.length === 0) {
      return values.data.join(", ");
    }
    return values.data.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  if (field.fieldType === "consent") {
    return value === true ? "同意済み" : "未同意";
  }
  if (field.fieldType === "description" || field.fieldType === "section") {
    return "-";
  }
  const scalarValue = scalarDisplayValueSchema.safeParse(value);
  if (scalarValue.success) {
    const opts = normalizeFieldOptions(field.options);
    if (
      opts.length > 0 &&
      (field.fieldType === "select" || field.fieldType === "radio") &&
      typeof scalarValue.data === "string"
    ) {
      return opts.find((o) => o.value === scalarValue.data)?.label ?? scalarValue.data;
    }
    return String(scalarValue.data);
  }
  return JSON.stringify(value);
}
