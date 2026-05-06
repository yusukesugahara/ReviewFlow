import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { listTenantUsers } from "@/lib/server/users-repository";
import { SpaceEmptyState } from "@/features/spaces/components/space-empty-state";
import { getCurrentSessionUser } from "@/lib/server/session";
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
  switch (error) {
    case "invalid_name":
      return "申請名を入力してください。";
    case "invalid_fields":
      return "フォーム項目を1件以上設定してください。";
    case "invalid_steps":
      return "承認ステップを1件以上設定してください。";
    case "approval_flow_requires_publish":
      return "下書き保存は完了しました。承認フローは公開済みフォームにしか保存できないバックエンドが起動中です。backend を再起動するか、申請公開で保存してください。";
    case "save_failed":
      return "保存に失敗しました。入力内容を確認して再度実行してください。";
    default:
      return null;
  }
}

function setupStatusMessage(status?: string): string | null {
  switch (status) {
    case "draft_saved":
      return "下書きを保存しました。";
    case "published":
      return "申請を公開しました。";
    default:
      return null;
  }
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
        params.setupStatus === "published" ? (params.publishedGroupId ?? null) : null
      }
      spaceId={spaceId}
      statusMessage={setupStatusMessage(params.setupStatus)}
    />
  );
}
