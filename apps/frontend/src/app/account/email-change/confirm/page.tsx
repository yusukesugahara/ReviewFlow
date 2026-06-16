import { AccountEmailChangeConfirmView } from "./view";
import type { AccountEmailChangeConfirmPageProps } from "./types";

/**
 * メールアドレス変更確認画面をクエリ状態付きで表示します。
 */
export default async function AccountEmailChangeConfirmPage({
  searchParams,
}: AccountEmailChangeConfirmPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <AccountEmailChangeConfirmView
      formError={params.formError}
      token={params.token ?? ""}
    />
  );
}
