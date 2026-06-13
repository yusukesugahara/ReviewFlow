import { AccountPasswordForm } from "./_components/account-password-form";
import { AccountProfileForm } from "./_components/account-profile-form";
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
      <div className="grid gap-4 xl:grid-cols-2">
        <AccountProfileForm error={profileError} user={user} />
        <AccountPasswordForm error={passwordError} />
      </div>
    </div>
  );
}
