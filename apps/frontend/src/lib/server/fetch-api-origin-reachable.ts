import "server-only";
import { getServerApiBaseUrl } from "@/lib/env";

/** ページ表示時に API オリジンへ到達できるかだけ確認する（認証は行わない） */
export async function fetchApiOriginReachable(): Promise<boolean> {
  try {
    const base = getServerApiBaseUrl();
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), 5_000);
    await fetch(`${base}/`, { method: "GET", cache: "no-store", signal: ac.signal });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}
