import Link from "next/link";
import {
  ApplicationSetupDraftForm,
  type ApprovalAssigneeOption,
} from "@/app/space/_components/application-setup-draft-form";
import { submitApplicationSetupAction } from "@/app/space/application-setup/actions";
import { Button } from "@/components/ui/button";
import {
  buildSpaceApplicationNewHref,
  buildSpaceApplicationsHref,
} from "@/app/_components/applications/application-routes";
import { backendAuthFetchJson } from "@/lib/server/backend-fetch";
import {
  APPLICATION_SETUP_ERROR_MESSAGES,
  APPLICATION_SETUP_STATUS_MESSAGES,
  APPLICATION_SETUP_STATUSES,
  type ApplicationSetupError,
  type ApplicationSetupStatus,
} from "@/lib/constants/application-setup";
import { getCurrentSessionUser } from "@/lib/server/session";
import { TENANT_ROLES } from "@/lib/constants/roles";

type GroupSummary = {
  currentUserRole?: "admin" | "user" | null;
  id: string;
};

type GroupMemberSummary = {
  email: string;
  name: string | null;
  userId: string;
};

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{
    publishedGroupId?: string;
    publishedFormDefinitionId?: string;
    setupError?: string;
    setupErrorDetail?: string;
    setupStatus?: string;
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

function setupErrorDetailMessage(detail?: string): string | null {
  return typeof detail === "string" && detail.trim().length > 0
    ? detail.trim()
    : null;
}

function setupStatusMessage(status?: string): string | null {
  return status && status in APPLICATION_SETUP_STATUS_MESSAGES
    ? APPLICATION_SETUP_STATUS_MESSAGES[status as ApplicationSetupStatus]
    : null;
}

export default async function SpaceNewApplicationPage({
  params,
  searchParams,
}: PageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Awaited<NonNullable<PageProps["searchParams"]>>),
  ]);
  const newApplicationHref = buildSpaceApplicationNewHref(spaceId);

  const [groupsRaw, me] = await Promise.all([
    backendAuthFetchJson("/groups"),
    getCurrentSessionUser(),
  ]);
  const groups = unwrapData<{ groups?: GroupSummary[] }>(groupsRaw).groups ?? [];
  const currentGroup = groups.find((group) => group.id === spaceId);
  const canManageSpace =
    me?.roles.includes(TENANT_ROLES.admin) ||
    currentGroup?.currentUserRole === "admin";
  let assignees: ApprovalAssigneeOption[] = [];
  if (canManageSpace) {
    const membersRaw = await backendAuthFetchJson(`/groups/${spaceId}/members`);
    const members =
      unwrapData<{ members?: GroupMemberSummary[] }>(membersRaw).members ?? [];
    assignees = members.map((member) => ({
      id: member.userId,
      label: member.name ? `${member.name} (${member.email})` : member.email,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請作成</h2>
          <p className="text-muted-foreground">
            申請項目と承認ステップを設定し、新しい申請を作成します
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={buildSpaceApplicationsHref(spaceId)}>申請一覧へ戻る</Link>
        </Button>
      </div>

      {canManageSpace ? (
        <div className="space-y-4">
          <ApplicationSetupDraftForm
            action={submitApplicationSetupAction}
            assignees={assignees}
            errorMessage={
              [
                setupErrorMessage(query.setupError),
                setupErrorDetailMessage(query.setupErrorDetail),
              ]
                .filter(Boolean)
                .join(" ")
            }
            publishedGroupId={
              query.setupStatus === APPLICATION_SETUP_STATUSES.published
                ? (query.publishedGroupId ?? null)
                : null
            }
            publishedFormDefinitionId={
              query.setupStatus === APPLICATION_SETUP_STATUSES.published
                ? (query.publishedFormDefinitionId ?? null)
                : null
            }
            returnPath={newApplicationHref}
            spaceId={spaceId}
            statusMessage={setupStatusMessage(query.setupStatus)}
          />
        </div>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-muted-foreground">
          新規申請を作成するにはスペース管理者権限が必要です。
        </p>
      )}
    </div>
  );
}
