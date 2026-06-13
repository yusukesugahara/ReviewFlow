import {
  FIELD_TYPES,
  isFieldType,
  type FieldType,
} from "@/lib/constants/form-fields";

export function asFieldType(value: string): FieldType {
  return isFieldType(value) ? value : FIELD_TYPES.text;
}

export function optionsToLines(options: unknown[] | null | undefined): string {
  if (!Array.isArray(options)) {
    return "";
  }
  return options
    .map((option) => {
      if (option && typeof option === "object") {
        const raw = option as { label?: unknown; value?: unknown };
        if (typeof raw.label === "string" && raw.label.trim().length > 0) {
          return raw.label.trim();
        }
        if (typeof raw.value === "string" && raw.value.trim().length > 0) {
          return raw.value.trim();
        }
      }
      if (typeof option === "string") {
        return option.trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function linesToOptions(optionsText: string): string[] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line.length > 0 && all.indexOf(line) === index);
}
