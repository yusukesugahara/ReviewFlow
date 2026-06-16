import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
} from "@/lib/constants/applications";

export type ApplicationStatusBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

/**
 * 申請ステータスに対応するバッジ variant を返します。
 */
export function getApplicationStatusBadgeVariant(
  status: string,
): ApplicationStatusBadgeVariant {
  switch (status) {
    case APPLICATION_STATUSES.approved:
      return "default";
    case APPLICATION_STATUSES.inReview:
      return "secondary";
    case APPLICATION_STATUSES.returned:
    case APPLICATION_STATUSES.rejected:
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * 申請ステータスを画面表示用ラベルに変換します。
 */
export function getApplicationStatusLabel(status: string): string {
  return APPLICATION_STATUS_LABELS[status as keyof typeof APPLICATION_STATUS_LABELS] ?? status;
}
