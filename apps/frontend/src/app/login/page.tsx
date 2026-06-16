import { LoginView } from "./view";
import { isApiOriginReachable } from "@/lib/server/api-origin";
import type { LoginPageProps } from "./types";

/**
 * ログイン画面の API 接続状態と next クエリを読み込んで表示します。
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const apiReachable = await isApiOriginReachable();
  const params = (await searchParams) ?? {};
  return <LoginView apiReachable={apiReachable} next={params.next} />;
}
