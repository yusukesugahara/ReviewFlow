import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import { SpaceManagementHeader } from "./_components/space-management-header";
import { SpaceList } from "./_components/space-list";

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupMemberSummary = {
  id: string;
  groupId: string;
  userId: string;
  email: string;
  name: string | null;
  role: "admin" | "user" | string;
  createdAt: string;
  updatedAt: string;
};

type TenantUserSummary = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type AvailableUserSummary = {
  id: string;
  email: string;
  name: string | null;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

function spaceErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof BackendHttpError)) {
    return fallback;
  }

  const body = error.body;
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  if (error.status === 403) {
    return "この操作を実行する権限がありません";
  }
  if (error.status === 409) {
    return "同じ名前のスペース、または既存のメンバーと重複しています";
  }
  if (error.status === 400) {
    return "入力内容を確認してください";
  }
  return `${fallback}（status: ${error.status}）`;
}

function redirectWithSpaceError(error: unknown, fallback: string): never {
  const nextParams = new URLSearchParams({
    error: spaceErrorMessage(error, fallback),
  });
  redirect(`/admin/spaces?${nextParams.toString()}`);
}

async function createSpaceAction(formData: FormData): Promise<void> {
  "use server";
  const name = formData.get("name");
  const description = formData.get("description");
  const adminUserIds = formData
    .getAll("adminUserIds")
    .filter((value): value is string => typeof value === "string");

  if (typeof name !== "string" || adminUserIds.length === 0) {
    return;
  }

  try {
    await backendAuthFetchJson("/groups", {
      method: "POST",
      body: {
        name: name.trim(),
        description:
          typeof description === "string" ? description.trim() : undefined,
        adminUserIds,
      },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースの作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function addMemberAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  "use server";
  const userId = formData.get("userId");
  const role = formData.get("role");

  if (typeof userId !== "string" || typeof role !== "string") {
    return;
  }

  try {
    await backendAuthFetchJson(`/groups/${groupId}/members`, {
      method: "POST",
      body: { userId, role },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースメンバーの追加に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function inviteSpaceMemberAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  "use server";
  const email = formData.get("email");
  const tenantRole = formData.get("tenantRole");
  const groupRole = formData.get("groupRole");

  if (
    typeof email !== "string" ||
    typeof tenantRole !== "string" ||
    typeof groupRole !== "string"
  ) {
    return;
  }

  try {
    await backendAuthFetchJson("/invitations", {
      method: "POST",
      body: {
        email: email.trim(),
        role: tenantRole,
        groupId,
        groupRole,
      },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペース招待の作成に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function updateMemberRoleAction(
  groupId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  "use server";
  const role = formData.get("role");

  if (typeof role !== "string") {
    return;
  }

  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/${userId}/role`, {
      method: "PATCH",
      body: { role },
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースロールの更新に失敗しました");
  }

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function removeMemberAction(
  groupId: string,
  userId: string,
): Promise<void> {
  "use server";
  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースメンバーの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function leaveSpaceAction(groupId: string): Promise<void> {
  "use server";
  try {
    await backendAuthFetchJson(`/groups/${groupId}/members/me`, {
      method: "DELETE",
    });
  } catch (error) {
    redirectWithSpaceError(error, "スペースからの退出に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function removeSpaceAction(groupId: string): Promise<void> {
  "use server";
  try {
    await backendAuthFetchJson(`/groups/${groupId}`, { method: "DELETE" });
  } catch (error) {
    redirectWithSpaceError(error, "スペースの削除に失敗しました");
  }
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function fetchGroupMembers(
  groupId: string,
): Promise<GroupMemberSummary[]> {
  try {
    const raw = await backendAuthFetchJson(`/groups/${groupId}/members`);
    return unwrapData<{ members?: GroupMemberSummary[] }>(raw).members ?? [];
  } catch (error) {
    if (error instanceof BackendHttpError && error.status === 403) {
      return [];
    }
    throw error;
  }
}

async function fetchAvailableUsers(
  groupId: string,
): Promise<AvailableUserSummary[]> {
  try {
    const raw = await backendAuthFetchJson(
      `/groups/${groupId}/available-users`,
    );
    return unwrapData<{ users?: AvailableUserSummary[] }>(raw).users ?? [];
  } catch (error) {
    if (error instanceof BackendHttpError && error.status === 403) {
      return [];
    }
    throw error;
  }
}

type PageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AdminSpacesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const me = await getCurrentSessionUser();
  const isSystemAdmin = me?.roles.includes("platform_admin") ?? false;
  const canCreateSpace =
    isSystemAdmin || (me?.roles.includes("tenant_admin") ?? false);

  try {
    const [groupsRaw, usersRaw] = await Promise.all([
      backendAuthFetchJson("/groups"),
      canCreateSpace ? backendAuthFetchJson("/users") : Promise.resolve(null),
    ]);
    const groups =
      unwrapData<{ groups?: GroupSummary[] }>(groupsRaw).groups ?? [];
    const users = usersRaw
      ? (unwrapData<{ users?: TenantUserSummary[] }>(usersRaw).users ?? [])
      : [];
    const membersByGroup = new Map<string, GroupMemberSummary[]>();
    const availableUsersByGroup = new Map<string, AvailableUserSummary[]>();

    for (const group of groups) {
      const [members, availableUsers] = await Promise.all([
        fetchGroupMembers(group.id),
        fetchAvailableUsers(group.id),
      ]);
      membersByGroup.set(group.id, members);
      availableUsersByGroup.set(group.id, availableUsers);
    }

    return (
      <div className="space-y-6">
        <SpaceManagementHeader
          canCreateSpace={canCreateSpace}
          users={users}
          createSpaceAction={createSpaceAction}
        />

        {params.error ? (
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-red-700">
                {params.error}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              スペースが見つかりません
            </CardContent>
          </Card>
        ) : (
          <SpaceList
            spaces={groups.map((group) => {
              const members = membersByGroup.get(group.id) ?? [];
              return {
                group,
                members,
                addableUsers: availableUsersByGroup.get(group.id) ?? [],
                canManageSpace:
                  isSystemAdmin ||
                  members.some(
                    (member) =>
                      member.userId === me?.id && member.role === "admin",
                  ),
              };
            })}
            currentUserId={me?.id ?? null}
            isSystemAdmin={isSystemAdmin}
            addMemberAction={addMemberAction}
            inviteSpaceMemberAction={inviteSpaceMemberAction}
            updateMemberRoleAction={updateMemberRoleAction}
            removeMemberAction={removeMemberAction}
            leaveSpaceAction={leaveSpaceAction}
            removeSpaceAction={removeSpaceAction}
          />
        )}
      </div>
    );
  } catch (error) {
    const status =
      error instanceof BackendHttpError ? `（status: ${error.status}）` : "";
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">
            スペース管理情報の取得に失敗しました{status}
          </p>
        </CardContent>
      </Card>
    );
  }
}
