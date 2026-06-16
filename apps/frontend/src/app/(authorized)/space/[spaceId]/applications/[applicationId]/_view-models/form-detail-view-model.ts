import {
  isPublishedApplicationStatus,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
} from "@/components/applications/status/application-status-rules";
import { formatDateTimeJa } from "@/lib/date-format";
import type { FormDetailViewProps } from "../types";

export type FormDetailViewModel = {
  createdAtText: string;
  descriptionText: string;
  fieldCount: number;
  isPublished: boolean;
  name: string;
  returnCount: number;
  updatedAtText: string;
  waitingCount: number;
};

/**
 * フォーム詳細画面に表示する集計値と表示文言を組み立てます。
 */
export function buildFormDetailViewModel({
  application,
  definition,
  fields,
  relatedApplications,
}: Pick<
  FormDetailViewProps,
  "application" | "definition" | "fields" | "relatedApplications"
>): FormDetailViewModel {
  return {
    createdAtText: formatDateTime(definition?.createdAt ?? application.createdAt),
    descriptionText:
      definition?.description?.trim() || "説明は設定されていません。",
    fieldCount: fields.length,
    isPublished: isPublishedApplicationStatus(application.status),
    name: definition?.name ?? "フォーム",
    returnCount: relatedApplications.filter(isReturnedApplication).length,
    updatedAtText: formatDateTime(definition?.updatedAt ?? application.updatedAt),
    waitingCount: relatedApplications.filter(isSpaceNeedsActionApplication).length,
  };
}

/**
 * 日時文字列を画面表示用の日本語日時に変換します。
 */
function formatDateTime(value?: string): string {
  return value ? formatDateTimeJa(value) : "-";
}
