import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { unwrapData } from "@/lib/server/api-envelope";
import type { ApplicationRow } from "@/components/space/space-applications.types";
import type {
  ApplicationsListSuccessJson,
  ExportJobResponse,
  GetExportJobSuccessJson,
} from "@/lib/schema";
import type { SpaceSubmissionsApiFailure, SpaceSubmissionsPageProps } from "./types";
import { SpaceSubmissionsView } from "./view";

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function isApiFailure(error: unknown): error is SpaceSubmissionsApiFailure {
  return !!error && typeof error === "object" && typeof (error as SpaceSubmissionsApiFailure).status === "number";
}

export default async function SpaceSubmissionsPage({
  params,
  searchParams,
}: SpaceSubmissionsPageProps) {
  const { spaceId } = await params;
  const query = await searchParams;
  const filters = {
    applicant: normalizeSearchValue(query?.applicant),
    createdFrom: normalizeSearchValue(query?.createdFrom),
    createdTo: normalizeSearchValue(query?.createdTo),
    form: normalizeSearchValue(query?.form),
    page: normalizePage(query?.page),
    status: normalizeSearchValue(query?.status),
    summary: normalizeSummaryFilter(query?.summary),
  };
  const jobId = normalizeSearchValue(query?.jobId);
  const authHeaders = await authHeadersOrRedirect();

  try {
    const [applicationsRaw, jobRaw] = await Promise.all([
      client.GET("/applications", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      }),
      jobId
        ? client.GET("/export-jobs/{id}", {
            params: { path: { id: jobId } },
            headers: authHeaders,
          })
        : Promise.resolve(null),
    ]);
    const applicationsData: ApplicationsListSuccessJson | undefined = applicationsRaw.data;
    if (!applicationsRaw.response.ok || !applicationsData) {
      throw { status: applicationsRaw.response.status };
    }
    const latestExportJob =
      jobRaw?.response.ok && jobRaw.data
        ? unwrapData<ExportJobResponse>(
            jobRaw.data as GetExportJobSuccessJson,
          )
        : null;

    return (
      <SpaceSubmissionsView
        applications={
          unwrapData<ApplicationsListSuccessJson["data"]>(applicationsData)
            .applications as ApplicationRow[]
        }
        filters={filters}
        latestExportJob={latestExportJob}
        spaceId={spaceId}
      />
    );
  } catch (error) {
    return (
      <SpaceSubmissionsView
        applications={[]}
        fetchErrorStatus={isApiFailure(error) ? error.status : 500}
        filters={filters}
        latestExportJob={null}
        spaceId={spaceId}
      />
    );
  }
}

function normalizeSearchValue(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePage(value?: string): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeSummaryFilter(value?: string): "" | "needsAction" | "recentProcessed" {
  if (value === "needsAction" || value === "recentProcessed") {
    return value;
  }
  return "";
}
