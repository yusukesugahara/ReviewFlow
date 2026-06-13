import { formatDateTimeJa } from "@/lib/date-format";
import type { ApplicationDetailViewModel } from "./application-detail.types";

export function descriptionForFields(
  description: string,
  fieldsCount: number,
): string {
  return `${description}。${fieldsCount}項目の入力内容を確認できます。`;
}

export function getCurrentStep(application: ApplicationDetailViewModel) {
  return application.approvalProgress?.find((step) => step.status === "current");
}

export function formatApplicationDateTime(value?: string | null): string {
  return value ? formatDateTimeJa(value) : "-";
}
