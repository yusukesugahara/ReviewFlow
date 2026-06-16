import { AccountDetailsPanel } from "./_components/account-details-panel";
import type { AccountViewProps } from "./types";

/**
 * アカウント設定画面を表示します。
 */
export function AccountView({
  emailError,
  passwordError,
  profileError,
  user,
}: AccountViewProps) {
  return (
    <div>
      <AccountDetailsPanel
        emailError={emailError}
        passwordError={passwordError}
        profileError={profileError}
        user={user}
      />
    </div>
  );
}
