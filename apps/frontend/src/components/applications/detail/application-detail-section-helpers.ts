import { formatDateTimeJa } from "@/lib/date-format";
import type { ApplicationDetailViewModel } from "./application-detail.types";

/**
 * 申請詳細の項目数に応じた説明文を返します。
 */
export function descriptionForFields(
  description: string,
  fieldsCount: number,
): string {
  return `${description}。${fieldsCount}項目の入力内容を確認できます。`;
}

/**
 * 申請詳細から現在の承認ステップを取得します。
 */
export function getCurrentStep(application: ApplicationDetailViewModel) {
  return application.approvalProgress?.find((step) => step.status === "current");
}

/**
 * 申請詳細で使う日時表示文字列を返します。
 */
export function formatApplicationDateTime(value?: string | null): string {
  return value ? formatDateTimeJa(value) : "-";
}
