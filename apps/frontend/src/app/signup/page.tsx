import { SignupView } from "./view";
import { isApiOriginReachable } from "@/lib/server/api-origin";

/**
 * サインアップ画面の API 接続状態を読み込んで表示します。
 */
export default async function SignupPage() {
  const apiReachable = await isApiOriginReachable();
  return <SignupView apiReachable={apiReachable} />;
}
