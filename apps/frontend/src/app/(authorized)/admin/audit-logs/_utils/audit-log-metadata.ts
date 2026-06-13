export type AuditMetadata = {
  durationMs?: unknown;
  errorCode?: unknown;
  ip?: unknown;
  method?: unknown;
  path?: unknown;
  role?: unknown;
  statusCode?: unknown;
  success?: unknown;
  userAgent?: unknown;
};

export function readMetadata(value: unknown): AuditMetadata {
  return value && typeof value === "object" ? (value as AuditMetadata) : {};
}

export function normalizeAuditPath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? "";
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

export function shortId(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? `${value.slice(0, 8)}...` : "-";
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

export function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}
