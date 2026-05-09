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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { spaceRoleLabel } from "@/lib/constants/role-labels";
import {
  SPACE_ROLE_OPTIONS,
  SPACE_ROLES,
  TENANT_ROLES,
} from "@/lib/constants/roles";
import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";

type GroupSummary = {
  id: string;
  name: string;
};

type GroupMemberSummary = {
  id: string;
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
  searchParams?: Promise<{ spaceId?: string; error?: string }>;
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
    error: spaceUsersErrorMessage(error, fallback),
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
    return;
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
  redirect(`/space/users?spaceId=${encodeURIComponent(groupId)}`);
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>スペースロール</TableHead>
                    <TableHead>追加日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === SPACE_ROLES.admin
                              ? "default"
                              : "outline"
                          }
                        >
                          {spaceRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString("ja-JP")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
