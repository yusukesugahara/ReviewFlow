export type FieldOption = { value: string; label: string };

export type DisplayableFormField = {
  fieldType: string;
  options?: unknown[] | null;
};

export function normalizeFieldOptions(
  options: unknown[] | null | undefined,
): FieldOption[] {
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

export function renderFieldValue(field: DisplayableFormField, value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (field.fieldType === "checkbox") {
    if (!Array.isArray(value)) {
      return "-";
    }
    const opts = normalizeFieldOptions(field.options);
    const asStrings = value.filter((v): v is string => typeof v === "string");
    if (opts.length === 0) {
      return asStrings.join(", ");
    }
    return asStrings.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  if (typeof value === "string" || typeof value === "number") {
    const opts = normalizeFieldOptions(field.options);
    if (
      opts.length > 0 &&
      (field.fieldType === "select" || field.fieldType === "radio") &&
      typeof value === "string"
    ) {
      return opts.find((o) => o.value === value)?.label ?? value;
    }
    return String(value);
  }
  return JSON.stringify(value);
}
