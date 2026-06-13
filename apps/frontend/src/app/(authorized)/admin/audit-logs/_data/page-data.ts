import "server-only";

import type { AuditLogsListSuccessJson } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AdminAuditLogsViewProps } from "../types";

type AdminAuditLogSearchParams = {
  createdFrom?: string;
  createdTo?: string;
  outcome?: string;
  q?: string;
  risk?: string;
};

export async function getAdminAuditLogsPageData(
  params?: AdminAuditLogSearchParams,
): Promise<AdminAuditLogsViewProps> {
  const createdFrom = normalizeDateValue(params?.createdFrom);
  const createdTo = normalizeDateValue(params?.createdTo);
  const outcome = normalizeOption(params?.outcome, ["all", "failed", "success"]);
  const query = normalizeSearchValue(params?.q);
  const risk = normalizeOption(params?.risk, ["all", "high", "medium", "low"]);

  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    throw { status: 401 };
  }

  const response = await client.GET("/audit-logs", {
    params: {
      query: {
        limit: 200,
        ...(query ? { q: query } : {}),
        ...(createdFrom ? { createdFrom: toIsoDateStart(createdFrom) } : {}),
        ...(createdTo ? { createdTo: toIsoDateEnd(createdTo) } : {}),
      },
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    createdFrom,
    createdTo,
    outcome,
    query,
    risk,
    rows: unwrapResponseData<AuditLogsListSuccessJson["data"]>(response).logs ?? [],
  };
}

function normalizeSearchValue(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDateValue(value?: string): string {
  const normalized = normalizeSearchValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return "";
  }
  const timestamp = new Date(`${normalized}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? "" : normalized;
}

function toIsoDateStart(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

function toIsoDateEnd(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function normalizeOption(value: string | undefined, allowed: string[]): string {
  return typeof value === "string" && allowed.includes(value)
    ? value
    : (allowed[0] ?? "");
}
