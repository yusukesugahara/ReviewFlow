import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userRoleLabel } from "@/lib/constants/role-labels";
import { formatDateJa } from "@/lib/date-format";
import type { TenantUserSummary } from "@/lib/schema";
import { deleteUserAction, restoreUserAction } from "../actions";
import { AdminUserDeleteDialog } from "./admin-user-delete-dialog";

type AdminUserTableProps = {
  currentUserId: string | null;
  users: TenantUserSummary[];
};

/**
 * テナントユーザー一覧をテーブルとして表示します。
 */
export function AdminUserTable({ currentUserId, users }: AdminUserTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<TenantUserSummary | null>(
    null,
  );
  const deleteFormRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>登録日</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name ?? "-"}</TableCell>
              <TableCell className="font-mono text-xs">{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "有効" : "削除済み"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{userRoleLabel(user.role)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateJa(user.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                {user.id === currentUserId ? null : user.isActive ? (
                  <>
                    <form
                      action={deleteUserAction.bind(null, user.id)}
                      ref={deleteTarget?.id === user.id ? deleteFormRef : null}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            type="button"
                            variant="destructive"
                            aria-label={`${user.email} を削除`}
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>削除</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                ) : (
                  <form action={restoreUserAction.bind(null, user.id)}>
                    <Button size="sm" type="submit" variant="outline">
                      復活
                    </Button>
                  </form>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {deleteTarget ? (
        <AdminUserDeleteDialog
          deleteFormRef={deleteFormRef}
          onClose={() => setDeleteTarget(null)}
          user={deleteTarget}
        />
      ) : null}
    </>
  );
}
