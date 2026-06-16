import { ForgotPasswordView } from "./view";
import type { ForgotPasswordPageProps } from "./types";

/**
 * パスワード再設定依頼画面をクエリ状態付きで表示します。
 */
export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <ForgotPasswordView
      sent={params.sent === "1"}
      formError={params.formError}
    />
  );
}
