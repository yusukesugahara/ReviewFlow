import type { FieldOption } from "./dynamic-fields.types";

export function normalizeFieldOptions(options: unknown[] | null | undefined): FieldOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }

      if (opt && typeof opt === "object") {
        const rec = opt as Record<string, unknown>;
        const value = rec.value;
        const label = rec.label;
        if (typeof value === "string" && typeof label === "string") {
          return { value, label };
        }
      }

      return null;
    })
    .filter((v): v is FieldOption => v !== null);
}
