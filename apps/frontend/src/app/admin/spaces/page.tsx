import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentSessionUser } from "@/lib/server/session";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-auth-fetch";
import { SpaceManagementHeader } from "./_components/space-management-header";

type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type GroupMemberSummary = {
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

type AvailableUserSummary = {
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

function groupRoleLabel(role: string) {
  return role === "admin" ? "スペース管理者" : "スペースユーザー";
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

  await backendAuthFetchJson("/groups", {
    method: "POST",
    body: {
      name: name.trim(),
      description:
        typeof description === "string" ? description.trim() : undefined,
      adminUserIds,
    },
  });

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

  await backendAuthFetchJson(`/groups/${groupId}/members`, {
    method: "POST",
    body: { userId, role },
  });

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

  await backendAuthFetchJson(`/groups/${groupId}/members/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });

  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function removeMemberAction(
  groupId: string,
  userId: string,
): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
  });
  revalidatePath("/admin/spaces");
  redirect("/admin/spaces");
}

async function removeSpaceAction(groupId: string): Promise<void> {
  "use server";
  await backendAuthFetchJson(`/groups/${groupId}`, { method: "DELETE" });
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

export default async function AdminSpacesPage() {
  const me = await getCurrentSessionUser();
  const isSystemAdmin = me?.roles.includes("platform_admin") ?? false;

  try {
    const [groupsRaw, usersRaw] = await Promise.all([
      backendAuthFetchJson("/groups"),
      isSystemAdmin ? backendAuthFetchJson("/users") : Promise.resolve(null),
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
          canCreateSpace={isSystemAdmin}
          users={users}
          createSpaceAction={createSpaceAction}
        />

        <div className="space-y-4">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                スペースが見つかりません
              </CardContent>
            </Card>
          ) : (
            groups.map((group) => {
              const members = membersByGroup.get(group.id) ?? [];
              const addableUsers = availableUsersByGroup.get(group.id) ?? [];

              return (
                <Card key={group.id}>
                  <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription>
                        {group.description ?? "説明は設定されていません"}
                      </CardDescription>
                    </div>
                    {isSystemAdmin ? (
                      <form action={removeSpaceAction.bind(null, group.id)}>
                        <Button size="sm" type="submit" variant="outline">
                          削除
                        </Button>
                      </form>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <form
                      action={addMemberAction.bind(null, group.id)}
                      className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
                    >
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        name="userId"
                        required
                      >
                        <option value="">追加するユーザーを選択</option>
                        {addableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name ?? user.email} / {user.email}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        name="role"
                        defaultValue="user"
                      >
                        <option value="user">ユーザー</option>
                        <option value="admin">管理者</option>
                      </select>
                      <Button size="sm" type="submit">
                        追加
                      </Button>
                    </form>

                    {members.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        メンバーを表示できません
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>名前</TableHead>
                            <TableHead>メール</TableHead>
                            <TableHead>スペースロール</TableHead>
                            <TableHead className="text-right">操作</TableHead>
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
                                    member.role === "admin"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {groupRoleLabel(member.role)}
                                </Badge>
                              </TableCell>
                              <TableCell className="space-x-2 text-right">
                                <form
                                  action={updateMemberRoleAction.bind(
                                    null,
                                    group.id,
                                    member.userId,
                                  )}
                                  className="inline-flex items-center gap-2"
                                >
                                  <select
                                    name="role"
                                    defaultValue={member.role}
                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                  >
                                    <option value="user">ユーザー</option>
                                    <option value="admin">管理者</option>
                                  </select>
                                  <Button
                                    size="sm"
                                    type="submit"
                                    variant="outline"
                                  >
                                    更新
                                  </Button>
                                </form>
                                <form
                                  action={removeMemberAction.bind(
                                    null,
                                    group.id,
                                    member.userId,
                                  )}
                                  className="inline-flex"
                                >
                                  <Button
                                    size="sm"
                                    type="submit"
                                    variant="outline"
                                  >
                                    外す
                                  </Button>
                                </form>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
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
