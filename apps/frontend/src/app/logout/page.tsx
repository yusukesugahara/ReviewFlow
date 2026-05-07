import Link from "next/link";
import { getServerApiBaseUrl } from "@/lib/env";

async function fetchApiOriginReachable(): Promise<boolean> {
  try {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), 5_000);
    await fetch(`${getServerApiBaseUrl()}/`, {
      method: "GET",
      cache: "no-store",
      signal: ac.signal,
    });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

export default async function LogoutPage() {
  const apiReachable = await fetchApiOriginReachable();

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
