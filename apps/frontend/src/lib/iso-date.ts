/**
 * ISO 日付文字列を Date に変換し、無効な値は null にします。
 */
export function parseIsoDateValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

/**
 * ISO 日付文字列をローカル日付表示に変換します。
 */
export function formatIsoDateDisplay(value: string): string {
  const date = parseIsoDateValue(value);
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
