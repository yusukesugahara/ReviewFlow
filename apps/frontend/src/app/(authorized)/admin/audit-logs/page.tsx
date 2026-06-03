import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AuditLogsListSuccessJson } from "@/lib/schema";
import { AdminAuditLogsErrorView, AdminAuditLogsView } from "./view";

type AdminAuditLogsPageProps = {
  searchParams?: Promise<{
    createdFrom?: string;
    createdTo?: string;
    outcome?: string;
    q?: string;
    risk?: string;
  }>;
};

export default async function AdminAuditLogsPage({
  searchParams,
}: AdminAuditLogsPageProps) {
  const params = await searchParams;
  const createdFrom = normalizeDateTimeLocalValue(params?.createdFrom);
  const createdTo = normalizeDateTimeLocalValue(params?.createdTo);
  const outcome = normalizeOption(params?.outcome, ["all", "failed", "success"]);
  const query = normalizeSearchValue(params?.q);
  const risk = normalizeOption(params?.risk, ["all", "high", "medium", "low"]);

  try {
    const accessToken = await getAccessTokenFromCookie();
    if (!accessToken) {
      throw 401;
    }

    const apiQuery = {
      limit: 200,
      ...(query ? { q: query } : {}),
      ...(createdFrom ? { createdFrom: toIsoDateTime(createdFrom) } : {}),
      ...(createdTo ? { createdTo: toIsoDateTime(createdTo) } : {}),
    };
    const response = await client.GET("/audit-logs", {
      params: { query: apiQuery },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: AuditLogsListSuccessJson | undefined = response.data;
    if (!response.response.ok || !data) {
      throw response.response.status;
    }

    const rows = unwrapData<AuditLogsListSuccessJson["data"]>(data).logs ?? [];
    return (
      <AdminAuditLogsView
        createdFrom={createdFrom}
        createdTo={createdTo}
        outcome={outcome}
        query={query}
        risk={risk}
        rows={rows}
      />
    );
  } catch (error) {
    return (
      <AdminAuditLogsErrorView
        status={typeof error === "number" ? error : undefined}
      />
    );
  }
}

function normalizeSearchValue(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDateTimeLocalValue(value?: string): string {
  const normalized = normalizeSearchValue(value);
  if (!normalized) {
    return "";
  }
  const timestamp = new Date(normalized).getTime();
  return Number.isNaN(timestamp) ? "" : normalized;
}

function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

function normalizeOption(value: string | undefined, allowed: string[]): string {
  return typeof value === "string" && allowed.includes(value) ? value : (allowed[0] ?? "");
}
