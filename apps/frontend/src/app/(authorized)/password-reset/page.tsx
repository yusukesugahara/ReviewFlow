import { PasswordResetView } from "./view";
import type { PasswordResetPageProps } from "./types";

/**
 * パスワード再設定画面をクエリ状態付きで表示します。
 */
export default async function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <PasswordResetView
      token={params.token ?? ""}
      formError={params.formError}
    />
  );
}
