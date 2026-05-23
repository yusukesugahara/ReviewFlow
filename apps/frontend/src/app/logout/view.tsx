import Link from "next/link";
import type { LogoutViewProps } from "./types";

export function LogoutView({ apiReachable }: LogoutViewProps) {
  return (
    <main style={{ padding: "1rem" }}>
      <p>ログアウトは画面上部のボタンから実行できます。</p>
      {!apiReachable ? (
        <p role="alert">API サーバーに接続できません（`NEXT_PUBLIC_API_URL` を確認してください）。</p>
      ) : null}
      <p>
        <Link href="/">トップへ</Link>
      </p>
    </main>
  );
}
