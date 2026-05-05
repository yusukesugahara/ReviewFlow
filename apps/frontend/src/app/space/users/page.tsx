import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendHttpError } from "@/lib/server/backend-auth-fetch";
import {
  listTenantUsers,
  updateTenantUserRole,
  type UpdateUserRoleInput,
} from "@/lib/server/users-repository";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { userRoleLabel } from "@/lib/constants/role-labels";

const editableRoles = new Set<UpdateUserRoleInput["role"]>([
  "tenant_admin",
  "tenant_user",
]);

function isUpdateUserRole(role: string): role is UpdateUserRoleInput["role"] {
  return editableRoles.has(role as UpdateUserRoleInput["role"]);
}

async function updateRoleAction(userId: string, formData: FormData): Promise<void> {
  "use server";
  const role = formData.get("role");
  if (typeof role !== "string" || !isUpdateUserRole(role)) {
    return;
  }

  await updateTenantUserRole(userId, { role });

  revalidatePath("/space/users");
  redirect("/space/users");
}

export default async function AdminUsersPage() {
  try {
    const users = await listTenantUsers();

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
                        <Badge variant="outline">{userRoleLabel(user.role)}</Badge>
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
                          <option value="tenant_admin">テナント管理者</option>
                          <option value="tenant_user">テナントユーザー</option>
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
