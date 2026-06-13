"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userRoleLabel } from "@/lib/constants/role-labels";
import { AccountPasswordEditDialog } from "./account-password-edit-dialog";
import { AccountProfileEditDialog } from "./account-profile-edit-dialog";

type AccountDialog = "password" | "profile";

type AccountDetailsPanelProps = {
  passwordError?: string;
  profileError?: string;
  user: CurrentSessionUser;
};

export function AccountDetailsPanel({
  passwordError,
  profileError,
  user,
}: AccountDetailsPanelProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState<AccountDialog | null>(
    profileError ? "profile" : passwordError ? "password" : null,
  );

  function openAccountDialog(dialog: AccountDialog) {
    setIsActionMenuOpen(false);
    setOpenDialog(dialog);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>アカウント詳細</CardTitle>
            <CardDescription>ログイン中のアカウント情報</CardDescription>
          </div>
          <div className="relative">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-expanded={isActionMenuOpen}
                    aria-haspopup="menu"
                    aria-label="アカウント操作"
                    onClick={() => setIsActionMenuOpen((current) => !current)}
                  >
                    <MoreVertical aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>アカウント操作</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {isActionMenuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="アクションメニューを閉じる"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  onClick={() => setIsActionMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-11 z-50 w-56 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                    role="menuitem"
                    onClick={() => openAccountDialog("profile")}
                  >
                    プロフィールを編集
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                    role="menuitem"
                    onClick={() => openAccountDialog("password")}
                  >
                    パスワードを変更
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid gap-4 md:grid-cols-2">
            <AccountDetailItem label="名前" value={user.name || "未設定"} />
            <AccountDetailItem label="メールアドレス" value={user.email} />
            <AccountDetailItem
              label="ロール"
              value={user.roles.map(userRoleLabel).join("、") || "-"}
            />
            <AccountDetailItem label="テナントID" value={user.tenantId} />
          </dl>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-950">パスワード</p>
              <p className="text-sm text-muted-foreground">設定済み</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {openDialog === "profile" ? (
        <AccountProfileEditDialog
          error={profileError}
          onClose={() => setOpenDialog(null)}
          user={user}
        />
      ) : null}
      {openDialog === "password" ? (
        <AccountPasswordEditDialog
          error={passwordError}
          onClose={() => setOpenDialog(null)}
        />
      ) : null}
    </>
  );
}

function AccountDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium text-slate-950">
        {value}
      </dd>
    </div>
  );
}
