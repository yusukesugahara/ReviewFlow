import {
  APPLICATION_SETUP_ERRORS,
  APPLICATION_SETUP_ERROR_MESSAGES,
} from "@/lib/constants/application-setup";
import { errorMessageFromBody, isApiFailure } from "@/lib/server/api-failure";
import type { ApplicationSetupApplicationStatus } from "./application-setup-action-input";

type BackendErrorBody = {
  errorCode?: unknown;
  message?: unknown;
};

export function redirectUrlWithParams(
  base: string,
  params: Record<string, string>,
): string {
  const [pathWithSearch = "", hash = ""] = base.split("#", 2);
  const [path, search = ""] = pathWithSearch.split("?", 2);
  const nextParams = new URLSearchParams(search);
  for (const [key, value] of Object.entries(params)) {
    nextParams.set(key, value);
  }
  const nextSearch = nextParams.toString();
  return `${path}${nextSearch ? `?${nextSearch}` : ""}${hash ? `#${hash}` : ""}`;
}

export function resolveCreateApplicationSetupRedirectBase(
  formData: FormData,
): string {
  const returnPath = formData.get("returnPath");
  return typeof returnPath === "string" && returnPath.startsWith("/space/")
    ? returnPath
    : "/space/application-setup";
}

export function resolveUpdateApplicationSetupRedirectBase(
  applicationId: string,
  formData: FormData,
): string {
  const returnPath = formData.get("returnPath");
  if (typeof returnPath === "string" && returnPath.startsWith("/space/")) {
    return returnPath;
  }

  const rawSpaceId = formData.get("spaceId");
  const spaceId = typeof rawSpaceId === "string" ? encodeURIComponent(rawSpaceId) : "";
  return `/space/${spaceId}/applications/${encodeURIComponent(applicationId)}/edit`;
}

export function setupErrorRedirectUrl(base: string, error: unknown): string {
  const params = new URLSearchParams({
    toast: "error",
    message: APPLICATION_SETUP_ERROR_MESSAGES[APPLICATION_SETUP_ERRORS.saveFailed],
  });
  if (isApiFailure(error)) {
    const body = error.body as BackendErrorBody;
    const message = errorMessageFromBody(error.body);
    const errorCode =
      typeof body.errorCode === "string" ? body.errorCode : undefined;
    const detail = errorCode
      ? `${errorCode}: ${message}`
      : `${error.status}: ${message}`;
    params.set("message", `申請フォームの保存に失敗しました（${detail}）`);
  }
  return redirectUrlWithParams(base, Object.fromEntries(params));
}

export function buildApplicationSetupListPath(spaceId: string): string {
  return `/space/${encodeURIComponent(spaceId)}/applications`;
}

export function buildApplicationSetupDetailPath({
  applicationId,
  applicationStatus,
  definitionId,
  spaceId,
}: {
  applicationId: string;
  applicationStatus: ApplicationSetupApplicationStatus;
  definitionId: string;
  spaceId: string;
}): string {
  const listPath = buildApplicationSetupListPath(spaceId);
  return `${listPath}/${encodeURIComponent(applicationId)}?${new URLSearchParams({
    definitionId,
    toast: "success",
    message:
      applicationStatus === "published"
        ? "申請フォームを公開しました"
        : "申請フォームを下書き保存しました",
  }).toString()}`;
}
