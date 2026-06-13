"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { userRoleLabel } from "@/lib/constants/role-labels";
import { AccountEmailEditDialog } from "./account-email-edit-dialog";
import { AccountPasswordEditDialog } from "./account-password-edit-dialog";
import { AccountProfileEditDialog } from "./account-profile-edit-dialog";

type AccountDialog = "email" | "password" | "profile";

type AccountDetailsPanelProps = {
  emailError?: string;
  passwordError?: string;
  profileError?: string;
  user: CurrentSessionUser;
};

export function AccountDetailsPanel({
  emailError,
  passwordError,
  profileError,
  user,
}: AccountDetailsPanelProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState<AccountDialog | null>(
    getInitialAccountDialog({ emailError, passwordError, profileError }),
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
            <h2 className="text-lg font-semibold text-slate-950">
              アカウント詳細
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ログイン中のアカウント情報
            </p>
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
                    onClick={() => openAccountDialog("email")}
                  >
                    メールアドレスを編集
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
        <CardContent>
          <dl className="divide-y divide-slate-200 border-y border-slate-200">
            <AccountDetailItem label="名前" value={user.name || "未設定"} />
            <AccountDetailItem label="メールアドレス" value={user.email} />
            <AccountDetailItem
              label="ロール"
              value={user.roles.map(userRoleLabel).join("、") || "-"}
            />
            <AccountDetailItem label="テナントID" value={user.tenantId} />
            <AccountDetailItem label="パスワード" value="設定済み" />
          </dl>
        </CardContent>
      </Card>
      {openDialog === "profile" ? (
        <AccountProfileEditDialog
          error={profileError}
          onClose={() => setOpenDialog(null)}
          user={user}
        />
      ) : null}
      {openDialog === "email" ? (
        <AccountEmailEditDialog
          error={emailError}
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

function getInitialAccountDialog({
  emailError,
  passwordError,
  profileError,
}: Pick<
  AccountDetailsPanelProps,
  "emailError" | "passwordError" | "profileError"
>): AccountDialog | null {
  if (profileError) {
    return "profile";
  }
  if (emailError) {
    return "email";
  }
  if (passwordError) {
    return "password";
  }
  return null;
}

function AccountDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 py-4 md:grid-cols-[160px_minmax(0,1fr)] md:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm font-medium text-slate-950">
        {value}
      </dd>
    </div>
  );
}
