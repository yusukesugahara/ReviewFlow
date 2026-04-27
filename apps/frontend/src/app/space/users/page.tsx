import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-auth-fetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TenantUserSummary = {
  id: string;
  email: string;
  name: string | null;
  role: "tenant_admin" | "approver" | string;
  isActive: boolean;
  createdAt: string;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

function roleLabel(role: string) {
  switch (role) {
    case "tenant_admin":
      return "管理者";
    case "approver":
      return "承認者";
    default:
      return role;
  }
}

async function updateRoleAction(userId: string, formData: FormData): Promise<void> {
  "use server";
  const role = formData.get("role");
  if (typeof role !== "string") return;

  await backendAuthFetchJson(`/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });

  revalidatePath("/space/users");
  redirect("/space/users");
}

export default async function AdminUsersPage() {
  try {
    const raw = await backendAuthFetchJson("/users");
    const users = unwrapData<{ users?: TenantUserSummary[] }>(raw).users ?? [];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ユーザー一覧</h2>
          <p className="text-muted-foreground">
            テナント内ユーザーの状態確認とロール変更ができます
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ユーザー管理</CardTitle>
            <CardDescription>{users.length}名のユーザーが登録されています</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">ユーザーが見つかりません</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>現在ロール</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead className="text-right">ロール変更</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabel(user.role)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <form
                          action={updateRoleAction.bind(null, user.id)}
                          className="inline-flex items-center gap-2"
                        >
                          <select
                            name="role"
                            defaultValue={user.role}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="tenant_admin">管理者</option>
                          <option value="approver">承認者</option>
                        </select>
                          <Button size="sm" type="submit" variant="outline">
                            更新
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
      </div>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">ユーザー一覧の取得に失敗しました（status: {error.status}）</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">ユーザー一覧の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
