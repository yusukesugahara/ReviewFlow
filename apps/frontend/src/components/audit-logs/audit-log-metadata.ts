export type AuditMetadata = Record<string, unknown>;

/**
 * unknown の監査ログメタデータをオブジェクトとして読み取ります。
 */
export function readMetadata(value: unknown): AuditMetadata {
  return value && typeof value === "object" ? (value as AuditMetadata) : {};
}

/**
 * ID 値を短縮表示用の文字列に変換します。
 */
export function shortId(value: unknown): string {
  return typeof value === "string" && value.length > 0
    ? `${value.slice(0, 8)}...`
    : "-";
}

/**
 * unknown 値を監査ログ表示用の文字列に変換します。
 */
export function textValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/**
 * unknown 値を監査ログ表示用の文字列配列に変換します。
 */
export function valueList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean);
  }
  const text = textValue(value);
  return text ? [text] : [];
}
