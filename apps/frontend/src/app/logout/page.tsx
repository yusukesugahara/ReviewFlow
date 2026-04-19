import { fetchApiOriginReachable } from "@/lib/server/fetch-api-origin-reachable";

export default async function LogoutPage() {
  const apiReachable = await fetchApiOriginReachable();

  return (
    <main style={{ padding: "1rem" }}>
      <p>ログアウトは画面上部のボタンから実行できます。</p>
      {!apiReachable ? (
        <p role="alert">API サーバーに接続できません（`NEXT_PUBLIC_API_URL` を確認してください）。</p>
      ) : null}
      <p>
        <a href="/">トップへ</a>
      </p>
    </main>
  );
}
