import "server-only";

import type { AuditLogsListSuccessJson } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AdminAuditLogsViewProps } from "../types";

type AdminAuditLogSearchParams = {
  createdFrom?: string;
  createdTo?: string;
  page?: string;
  q?: string;
  targetType?: string;
};

const AUDIT_LOG_PAGE_SIZE = 50;
const TARGET_TYPE_FILTERS = [
  "all",
  "application",
  "user",
  "invitation",
  "space",
  "group_member",
] as const;

/**
 * 管理者向け監査ログ画面の検索条件を正規化し、ページデータを読み込みます。
 */
export async function getAdminAuditLogsPageData(
  params?: AdminAuditLogSearchParams,
): Promise<AdminAuditLogsViewProps> {
  const createdFrom = normalizeDateValue(params?.createdFrom);
  const createdTo = normalizeDateValue(params?.createdTo);
  const page = normalizePage(params?.page);
  const query = normalizeSearchValue(params?.q);
  const targetType = normalizeOption(params?.targetType, TARGET_TYPE_FILTERS);

  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    throw { status: 401 };
  }

  const pageData = await fetchAuditLogsPage({
    accessToken,
    createdFrom,
    createdTo,
    page,
    query,
    targetType,
  });
  const totalPages = Math.max(1, Math.ceil(pageData.total / pageData.limit));
  const currentPage = Math.min(page, totalPages);
  const resolvedPageData =
    currentPage === page
      ? pageData
      : await fetchAuditLogsPage({
          accessToken,
          createdFrom,
          createdTo,
          page: currentPage,
          query,
          targetType,
        });

  return {
    createdFrom,
    createdTo,
    pagination: {
      currentPage,
      limit: resolvedPageData.limit,
      offset: resolvedPageData.offset,
      total: resolvedPageData.total,
      totalPages,
    },
    query,
    targetType,
    rows: resolvedPageData.logs,
  };
}

/**
 * 正規化済みの検索条件で監査ログの 1 ページ分を取得します。
 */
async function fetchAuditLogsPage({
  accessToken,
  createdFrom,
  createdTo,
  page,
  query,
  targetType,
}: {
  accessToken: string;
  createdFrom: string;
  createdTo: string;
  page: number;
  query: string;
  targetType: string;
}): Promise<{
  logs: AuditLogsListSuccessJson["data"]["logs"];
  limit: number;
  offset: number;
  total: number;
}> {
  const offset = (page - 1) * AUDIT_LOG_PAGE_SIZE;
  const response = await client.GET("/audit-logs", {
    params: {
      query: {
        limit: AUDIT_LOG_PAGE_SIZE,
        offset,
        ...(query ? { q: query } : {}),
        ...(targetType !== "all" ? { targetType } : {}),
        ...(createdFrom ? { createdFrom: toIsoDateStart(createdFrom) } : {}),
        ...(createdTo ? { createdTo: toIsoDateEnd(createdTo) } : {}),
      },
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrapResponseData<AuditLogsListSuccessJson["data"]>(response);

  return {
    logs: data.logs ?? [],
    limit: data.limit ?? AUDIT_LOG_PAGE_SIZE,
    offset: data.offset ?? offset,
    total: data.total ?? data.logs?.length ?? 0,
  };
}

/**
 * 検索文字列を画面と API で扱う標準形に整えます。
 */
function normalizeSearchValue(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 日付検索値を yyyy-MM-dd 形式として検証し、無効な値は空文字にします。
 */
function normalizeDateValue(value?: string): string {
  const normalized = normalizeSearchValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return "";
  }
  const timestamp = new Date(`${normalized}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? "" : normalized;
}

/**
 * ページ番号を正の整数に正規化します。
 */
function normalizePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * 日付値をその日の開始時刻の ISO 文字列に変換します。
 */
function toIsoDateStart(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

/**
 * 日付値をその日の終了時刻の ISO 文字列に変換します。
 */
function toIsoDateEnd(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

/**
 * 選択肢値を許可リスト内の値に正規化します。
 */
function normalizeOption<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] {
  return typeof value === "string" && allowed.includes(value)
    ? value
    : (allowed[0] ?? "");
}
