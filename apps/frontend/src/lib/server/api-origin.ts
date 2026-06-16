import "server-only";

import { getServerApiBaseUrl } from "@/lib/server/env";

const DEFAULT_API_ORIGIN_TIMEOUT_MS = 5_000;

export async function isApiOriginReachable(
  timeoutMs = DEFAULT_API_ORIGIN_TIMEOUT_MS,
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(`${getServerApiBaseUrl()}/`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
