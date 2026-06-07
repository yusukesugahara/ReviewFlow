import type { DynamicFormField } from "@/components/applications/dynamic-fields";

export function isDynamicFormField(value: unknown): value is DynamicFormField {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.fieldKey === "string" &&
    typeof row.label === "string" &&
    typeof row.fieldType === "string"
  );
}
