import {
  isFormSetupApplication,
  isPendingApplication,
  isProcessedApplication,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
} from "@/components/applications/application-status-rules";
import type { ApplicationRow } from "@/components/space/space-applications.types";

export {
  isFormSetupApplication,
  isPendingApplication,
  isReturnedApplication,
  isSpaceNeedsActionApplication,
};

export type SubmissionFilters = {
  applicant: string;
  createdFrom: string;
  createdTo: string;
  form: string;
  page: number;
  status: string;
  summary: SummaryFilter;
};

export type SummaryFilter =
  | ""
  | "myNeedsAction"
  | "spaceNeedsAction"
  | "returned"
  | "recentProcessed";

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type SubmissionSummaryCounts = {
  myNeedsAction: number;
  recentProcessed: number;
  returned: number;
  spaceNeedsAction: number;
};

export type SubmissionPagination = {
  currentPage: number;
  paginatedApplications: ApplicationRow[];
  totalPages: number;
};

export type SubmissionSearchParams = {
  applicant?: string;
  createdFrom?: string;
  createdTo?: string;
  form?: string;
  jobId?: string;
  page?: string;
  status?: string;
  summary?: string;
};

export type NormalizedSubmissionSearchParams = {
  filters: SubmissionFilters;
  jobId: string;
};

export function normalizeSubmissionSearchParams(
  query?: SubmissionSearchParams | null,
): NormalizedSubmissionSearchParams {
  return {
    filters: {
      applicant: normalizeSearchValue(query?.applicant),
      createdFrom: normalizeSearchValue(query?.createdFrom),
      createdTo: normalizeSearchValue(query?.createdTo),
      form: normalizeSearchValue(query?.form),
      page: normalizePage(query?.page),
      status: normalizeSearchValue(query?.status),
      summary: normalizeSummaryFilter(query?.summary),
    },
    jobId: normalizeSearchValue(query?.jobId),
  };
}

export function buildSubmittedApplications(
  applications: ApplicationRow[],
): ApplicationRow[] {
  return applications.filter((row) => !isFormSetupApplication(row));
}

export function buildSubmissionSummaryCounts(
  applications: ApplicationRow[],
  currentUserId?: string | null,
): SubmissionSummaryCounts {
  return {
    myNeedsAction: applications.filter((row) =>
      isAssignedToCurrentUser(row, currentUserId),
    ).length,
    recentProcessed: applications.filter(isRecentlyProcessedApplication).length,
    returned: applications.filter(isReturnedApplication).length,
    spaceNeedsAction: applications.filter(isSpaceNeedsActionApplication).length,
  };
}

export function hasSubmissionFilters(filters: SubmissionFilters): boolean {
  return (
    filters.applicant.length > 0 ||
    filters.createdFrom.length > 0 ||
    filters.createdTo.length > 0 ||
    filters.form.length > 0 ||
    filters.status.length > 0 ||
    filters.summary.length > 0
  );
}

export function paginateApplications(
  applications: ApplicationRow[],
  requestedPage: number,
  pageSize: number,
): SubmissionPagination {
  const totalPages = Math.max(1, Math.ceil(applications.length / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  return {
    currentPage,
    paginatedApplications: applications.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    ),
    totalPages,
  };
}

export function buildExportFormOptions(
  applications: ApplicationRow[],
): Array<{ id: string; name: string }> {
  const options = new Map<string, string>();
  for (const row of applications) {
    if (!row.formDefinitionId) {
      continue;
    }
    options.set(
      row.formDefinitionId,
      row.formDefinitionName?.trim() || row.applicationName?.trim() || row.formDefinitionId,
    );
  }
  return [...options.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function filterApplications(
  applications: ApplicationRow[],
  filters: SubmissionFilters,
  currentUserId?: string | null,
): ApplicationRow[] {
  const applicant = filters.applicant.toLowerCase();
  const form = filters.form.toLowerCase();
  const createdFrom = parseDateStart(filters.createdFrom);
  const createdTo = parseDateEnd(filters.createdTo);

  return applications.filter((row) => {
    if (
      filters.summary === "myNeedsAction" &&
      !isAssignedToCurrentUser(row, currentUserId)
    ) {
      return false;
    }
    if (
      filters.summary === "spaceNeedsAction" &&
      !isSpaceNeedsActionApplication(row)
    ) {
      return false;
    }
    if (filters.summary === "returned" && !isReturnedApplication(row)) {
      return false;
    }
    if (
      filters.summary === "recentProcessed" &&
      !isRecentlyProcessedApplication(row)
    ) {
      return false;
    }
    if (applicant && !row.applicantEmail?.toLowerCase().includes(applicant)) {
      return false;
    }
    if (form && !getApplicationFormSearchText(row).includes(form)) {
      return false;
    }
    if (filters.status && row.status !== filters.status) {
      return false;
    }

    const createdAt = new Date(row.createdAt).getTime();
    if (createdFrom !== null && createdAt < createdFrom) {
      return false;
    }
    if (createdTo !== null && createdAt > createdTo) {
      return false;
    }

    return true;
  });
}

export function buildSubmissionsPageHref(
  spaceId: string,
  filters: SubmissionFilters,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.applicant) {
    params.set("applicant", filters.applicant);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.form) {
    params.set("form", filters.form);
  }
  if (filters.createdFrom) {
    params.set("createdFrom", filters.createdFrom);
  }
  if (filters.createdTo) {
    params.set("createdTo", filters.createdTo);
  }
  if (filters.summary) {
    params.set("summary", filters.summary);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const pathname = `/space/${encodeURIComponent(spaceId)}/submissions`;
  return params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
}

export function buildSummaryFilterHref(spaceId: string, summary: SummaryFilter): string {
  const params = new URLSearchParams({ summary });
  return `/space/${encodeURIComponent(spaceId)}/submissions?${params.toString()}`;
}

export function isAssignedToCurrentUser(
  row: ApplicationRow,
  currentUserId?: string | null,
): boolean {
  if (!currentUserId || !isSpaceNeedsActionApplication(row)) {
    return false;
  }
  return row.currentStepAssigneeUserIds?.includes(currentUserId) ?? false;
}

export function isRecentlyProcessedApplication(row: ApplicationRow): boolean {
  if (!isProcessedApplication(row)) {
    return false;
  }
  const updatedAt = new Date(row.updatedAt).getTime();
  return Number.isFinite(updatedAt) && updatedAt >= Date.now() - RECENT_DAYS_MS;
}

function getApplicationFormSearchText(row: ApplicationRow): string {
  return [
    row.formDefinitionName,
    row.applicationName,
    row.formDefinitionId,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function parseDateStart(value: string): number | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function parseDateEnd(value: string): number | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizeSearchValue(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePage(value?: string): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeSummaryFilter(value?: string): SummaryFilter {
  if (
    value === "myNeedsAction" ||
    value === "spaceNeedsAction" ||
    value === "returned" ||
    value === "recentProcessed"
  ) {
    return value;
  }
  return "";
}
