import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { listTenantUsers } from "@/lib/server/users-repository";
import { SpaceEmptyState } from "@/features/spaces/components/space-empty-state";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  APPLICATION_SETUP_ERROR_MESSAGES,
  APPLICATION_SETUP_STATUS_MESSAGES,
  APPLICATION_SETUP_STATUSES,
  type ApplicationSetupError,
  type ApplicationSetupStatus,
} from "@/lib/constants/application-setup";
import { AdminApplicationSetupView } from "./view";

type PageProps = {
  searchParams?: Promise<{
    setupError?: string;
    setupStatus?: string;
    publishedGroupId?: string;
    spaceId?: string;
  }>;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

function setupErrorMessage(error?: string): string | null {
  return error && error in APPLICATION_SETUP_ERROR_MESSAGES
    ? APPLICATION_SETUP_ERROR_MESSAGES[error as ApplicationSetupError]
    : null;
}

function setupStatusMessage(status?: string): string | null {
  return status && status in APPLICATION_SETUP_STATUS_MESSAGES
    ? APPLICATION_SETUP_STATUS_MESSAGES[status as ApplicationSetupStatus]
    : null;
}

export default async function AdminApplicationSetupPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const [spacesRaw, me] = await Promise.all([
    backendAuthFetchJson("/groups"),
    getCurrentSessionUser(),
  ]);
  const spaces =
    unwrapData<{ groups?: { id: string }[] }>(spacesRaw).groups ?? [];
  const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
  if (!spaceId) {
    return <SpaceEmptyState userRoles={me?.roles ?? []} />;
  }
  const users = await listTenantUsers();
  const assignees = users
    .filter((user) => user.isActive)
    .map((user) => ({
      id: user.id,
      label: user.name ? `${user.name} (${user.email})` : user.email,
    }));

  return (
    <AdminApplicationSetupView
      assignees={assignees}
      errorMessage={setupErrorMessage(params.setupError)}
      publishedGroupId={
        params.setupStatus === APPLICATION_SETUP_STATUSES.published
          ? (params.publishedGroupId ?? null)
          : null
      }
      spaceId={spaceId}
      statusMessage={setupStatusMessage(params.setupStatus)}
    />
  );
}
