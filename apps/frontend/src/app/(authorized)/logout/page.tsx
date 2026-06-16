import { isApiOriginReachable } from "@/lib/server/api-origin";
import { LogoutView } from "./view";

/**
 * ログアウト画面の API 接続状態を読み込んで表示します。
 */
export default async function LogoutPage() {
  const apiReachable = await isApiOriginReachable();

  return <LogoutView apiReachable={apiReachable} />;
}
