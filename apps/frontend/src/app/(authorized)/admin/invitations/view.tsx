"use client";

import { useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TENANT_ROLE_OPTIONS, TENANT_ROLES } from "@/lib/constants/roles";
import { formatDateJa, formatDateTimeJa } from "@/lib/date-format";
import {
  createInvitationAction,
  deleteUserAction,
  restoreUserAction,
} from "./actions";
import type { AdminInvitationsViewProps } from "./types";
import type { TenantUserSummary } from "@/lib/schema";

export function AdminInvitationsView({
  sent,
  email,
  role,
  expiresAt,
  error,
  formError,
  currentUserId,
  userListError,
  users,
}: AdminInvitationsViewProps) {
  const isInvitationSent = sent === "1";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>新しい招待を送信</CardTitle>
          <CardDescription>
            メールアドレスとロールを指定して招待メールを送信します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError ? (
            <p className="mb-4 text-sm font-medium text-red-700">
              {formError}
            </p>
          ) : null}
          <form action={createInvitationAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="member@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">ロール</Label>
              <Select
                name="role"
                defaultValue={TENANT_ROLES.user}
              >
                <SelectTrigger id="role" className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENANT_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">招待メールを送信</Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {isInvitationSent ? (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader>
            <CardTitle>招待メールを送信しました</CardTitle>
            <CardDescription>
              対象ユーザーはメール内のリンクから招待を受諾できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {role ? <Badge>{userRoleLabel(role)}</Badge> : null}
              {email ? <Badge variant="outline">{email}</Badge> : null}
            </div>
            {expiresAt ? (
              <p className="text-xs text-muted-foreground">
                有効期限: {formatDateTimeJa(expiresAt)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>
            {users.length}名のユーザーが登録されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userListError ? (
            <p className="text-sm font-medium text-red-700">
              {userListError}
            </p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ユーザーが見つかりません
            </p>
          ) : (
            <UserTable currentUserId={currentUserId} users={users} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserTable({
  currentUserId,
  users,
}: {
  currentUserId: string | null;
  users: TenantUserSummary[];
}) {
  const [deleteTarget, setDeleteTarget] = useState<TenantUserSummary | null>(
    null,
  );
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const descriptionId = useId();

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
                {user.id === currentUserId ? (
                  <span className="text-sm text-muted-foreground">
                    自分自身
                  </span>
                ) : user.isActive ? (
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
        <div
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 id={titleId} className="text-lg font-semibold text-slate-900">
              ユーザーを削除しますか
            </h3>
            <p id={descriptionId} className="mt-2 text-sm text-slate-600">
              {deleteTarget.email} を削除済みにします。削除後もこの画面から復活できます。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteFormRef.current?.requestSubmit()}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
