import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TenantUserSummary } from "@/lib/schema";
import { AdminUserTable } from "./admin-user-table";

type AdminUserListCardProps = {
  currentUserId: string | null;
  userListError?: string;
  users: TenantUserSummary[];
};

export function AdminUserListCard({
  currentUserId,
  userListError,
  users,
}: AdminUserListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ユーザ一覧</CardTitle>
        <CardDescription>
          {users.length}名のユーザが登録されています
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userListError ? (
          <p className="text-sm font-medium text-red-700">
            {userListError}
          </p>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            ユーザが見つかりません
          </p>
        ) : (
          <AdminUserTable currentUserId={currentUserId} users={users} />
        )}
      </CardContent>
    </Card>
  );
}
