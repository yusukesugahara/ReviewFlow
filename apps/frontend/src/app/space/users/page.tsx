import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  SPACE_ROLE_OPTIONS,
  SPACE_ROLES,
  TENANT_ROLES,
} from "@/lib/constants/roles";
import { formatDateJa } from "@/lib/date-format";
import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";
import { SpaceUsersTable } from "./space-users-table";

type GroupSummary = {
  id: string;
  name: string;
};

type GroupMemberSummary = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  createdAt: string;
};

type AvailableUserSummary = {
  id: string;
  email: string;
  name: string | null;
};

type PageProps = {
  searchParams?: Promise<{
    spaceId?: string;
    error?: string;
    formError?: string;
  }>;
};

async function listSpaces(): Promise<GroupSummary[]> {
  const raw = await backendAuthFetchJson("/groups");
  return unwrapData<{ groups?: GroupSummary[] }>(raw).groups ?? [];
}

async function listSpaceMembers(groupId: string): Promise<GroupMemberSummary[]> {
  const raw = await backendAuthFetchJson(`/groups/${groupId}/members`);
  return unwrapData<{ members?: GroupMemberSummary[] }>(raw).members ?? [];
}

async function listAvailableUsers(
  groupId: string,
): Promise<AvailableUserSummary[]> {
  const raw = await backendAuthFetchJson(`/groups/${groupId}/available-users`);
  return unwrapData<{ users?: AvailableUserSummary[] }>(raw).users ?? [];
}

function spaceUsersErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof BackendHttpError)) {
    return fallback;
  }
  if (error.status === 403) {
    return "この操作を実行する権限がありません";
  }
  if (error.status === 409) {
    return "既にスペースへ追加済みのユーザーです";
  }
  if (error.status === 400) {
    return "入力内容を確認してください";
  }
  return `${fallback}（status: ${error.status}）`;
}

function redirectWithSpaceUsersError(
  groupId: string,
  error: unknown,
  fallback: string,
): never {
  const params = new URLSearchParams({
    spaceId: groupId,
    toast: "error",
    message: spaceUsersErrorMessage(error, fallback),
  });
  redirect(`/space/users?${params.toString()}`);
}

function redirectWithSpaceUsersValidationError(
  groupId: string,
  message: string,
): never {
  const params = new URLSearchParams({
    spaceId: groupId,
    formError: message,
  });
  redirect(`/space/users?${params.toString()}`);
}

async function addSpaceMemberAction(
  groupId: string,
  formData: FormData,
): Promise<void> {
  "use server";

  const userId = formData.get("userId");
  const role = formData.get("role");
  if (typeof userId !== "string" || typeof role !== "string") {
    redirectWithSpaceUsersValidationError(
      groupId,
      "追加するユーザーとロールを選択してください",
    );
  }

  try {
    await backendAuthFetchJson(`/groups/${groupId}/members`, {
      method: "POST",
      body: { userId, role },
    });
  } catch (error) {
    redirectWithSpaceUsersError(
      groupId,
      error,
      "スペースメンバーの追加に失敗しました",
    );
  }

  revalidatePath("/space/users");
  const params = new URLSearchParams({
    spaceId: groupId,
    toast: "success",
    message: "スペースメンバーを追加しました",
  });
  redirect(`/space/users?${params.toString()}`);
}

export default async function SpaceUsersPage({ searchParams }: PageProps) {
  try {
    const params = (await searchParams) ?? {};
    const [spaces, me] = await Promise.all([
      listSpaces(),
      getCurrentSessionUser(),
    ]);
    const spaceId = params.spaceId ?? spaces[0]?.id ?? "";
    if (!spaceId) {
      return <SpaceEmptyState userRoles={me?.roles ?? []} />;
    }

    const isTenantAdmin = me?.roles.includes(TENANT_ROLES.admin) ?? false;
    const currentSpace = spaces.find((space) => space.id === spaceId);
    const [members, availableUsers] = await Promise.all([
      listSpaceMembers(spaceId),
      isTenantAdmin ? listAvailableUsers(spaceId) : Promise.resolve([]),
    ]);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">メンバー</h2>
          <p className="text-muted-foreground">
            {currentSpace?.name ?? "選択中スペース"}{" "}
            のユーザーとスペースロールを確認できます
          </p>
        </div>

        {params.error ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-rose-700">
                {params.error}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {params.formError ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-rose-700">
                {params.formError}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {isTenantAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>ユーザーをスペースに追加</CardTitle>
              <CardDescription>
                同一テナント内の既存ユーザーを選択して、このスペースへ追加します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={addSpaceMemberAction.bind(null, spaceId)}
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
              >
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="userId"
                  required
                  disabled={availableUsers.length === 0}
                >
                  <option value="">追加するユーザーを選択</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name ?? user.email} / {user.email}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  name="role"
                  defaultValue={SPACE_ROLES.user}
                  disabled={availableUsers.length === 0}
                >
                  {SPACE_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={availableUsers.length === 0}>
                  追加
                </Button>
              </form>
              {availableUsers.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  追加できるユーザーはいません。
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>スペースユーザー一覧</CardTitle>
            <CardDescription>
              {members.length}名のユーザーが参加しています
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                ユーザーが見つかりません
              </p>
            ) : (
              <SpaceUsersTable
                currentUserId={me?.id ?? null}
                members={members.map((member) => ({
                  ...member,
                  createdAtLabel: formatDateJa(member.createdAt),
                }))}
                spaceId={spaceId}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">
            ユーザー一覧の取得に失敗しました
            {error instanceof BackendHttpError
              ? `（status: ${error.status}）`
              : ""}
          </p>
        </CardContent>
      </Card>
    );
  }
}
