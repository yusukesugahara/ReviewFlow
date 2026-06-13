export type AuditMetadata = Record<string, unknown>;

export function readMetadata(value: unknown): AuditMetadata {
  return value && typeof value === "object" ? (value as AuditMetadata) : {};
}

export function shortId(value: unknown): string {
  return typeof value === "string" && value.length > 0
    ? `${value.slice(0, 8)}...`
    : "-";
}

export function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function valueList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean);
  }
  const text = textValue(value);
  return text ? [text] : [];
}
