import { AccountDetailsPanel } from "./_components/account-details-panel";
import type { AccountViewProps } from "./types";

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
