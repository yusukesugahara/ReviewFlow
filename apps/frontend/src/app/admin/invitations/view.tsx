"use client";

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
import { userRoleLabel } from "@/lib/constants/role-labels";
import { CopyButton } from "@/features/admin/components/copy-button";
import { createInvitationAction } from "./actions";

type AdminInvitationsViewProps = {
  token?: string;
  email?: string;
  role?: string;
  expiresAt?: string;
  error?: string;
};

export function AdminInvitationsView({
  token,
  email,
  role,
  expiresAt,
  error,
}: AdminInvitationsViewProps) {
  const invitationUrl = token
    ? `/invitations/accept?token=${encodeURIComponent(token)}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ユーザー招待</h2>
        <p className="text-muted-foreground">
          招待URLを発行して、ユーザー・システム管理者を追加できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しい招待を発行</CardTitle>
          <CardDescription>
            メールアドレスとロールを指定して招待を作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <select
                id="role"
                name="role"
                defaultValue="tenant_user"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="tenant_user">テナントユーザー</option>
                <option value="tenant_admin">テナント管理者</option>
              </select>
            </div>
            <Button type="submit">招待URLを発行</Button>
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

      {invitationUrl ? (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardHeader>
            <CardTitle>招待を発行しました</CardTitle>
            <CardDescription>
              以下のURLを対象ユーザーへ共有してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {role ? <Badge>{userRoleLabel(role)}</Badge> : null}
              {email ? <Badge variant="outline">{email}</Badge> : null}
            </div>
            <p className="rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
              {invitationUrl}
            </p>
            <div className="flex items-center gap-2">
              <CopyButton value={invitationUrl} />
              {expiresAt ? (
                <p className="text-xs text-muted-foreground">
                  有効期限: {new Date(expiresAt).toLocaleString("ja-JP")}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
