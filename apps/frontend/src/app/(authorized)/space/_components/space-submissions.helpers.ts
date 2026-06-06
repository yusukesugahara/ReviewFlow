import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import type { ApplicationRow } from "./space-applications.types";

export type SubmissionFilters = {
  applicant: string;
  createdFrom: string;
  createdTo: string;
  form: string;
  page: number;
  status: string;
  summary: SummaryFilter;
};

export type SummaryFilter = "" | "needsAction" | "recentProcessed";

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
): ApplicationRow[] {
  const applicant = filters.applicant.toLowerCase();
  const form = filters.form.toLowerCase();
  const createdFrom = parseDateStart(filters.createdFrom);
  const createdTo = parseDateEnd(filters.createdTo);

  return applications.filter((row) => {
    if (filters.summary === "needsAction" && !isPendingApplication(row)) {
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

export function isFormSetupApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.draft ||
    row.status === APPLICATION_STATUSES.published
  );
}

export function isPendingApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.submitted ||
    row.status === APPLICATION_STATUSES.inReview ||
    row.status === APPLICATION_STATUSES.returned
  );
}

export function isProcessedApplication(row: ApplicationRow): boolean {
  return (
    row.status === APPLICATION_STATUSES.approved ||
    row.status === APPLICATION_STATUSES.rejected
  );
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
