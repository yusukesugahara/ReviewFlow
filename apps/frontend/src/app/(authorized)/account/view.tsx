import { AccountDetailsPanel } from "./_components/account-details-panel";
import type { AccountViewProps } from "./types";

export function AccountView({
  passwordError,
  profileError,
  user,
}: AccountViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
          アカウント
        </h1>
        <p className="text-sm text-muted-foreground">
          ログイン中の名前、メールアドレス、パスワードを管理します。
        </p>
      </div>
      <AccountDetailsPanel
        passwordError={passwordError}
        profileError={profileError}
        user={user}
      />
    </div>
  );
}
