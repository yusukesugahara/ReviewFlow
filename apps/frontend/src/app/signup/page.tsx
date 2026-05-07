import { SignupView } from "./view";
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

export default async function SignupPage() {
  const apiReachable = await fetchApiOriginReachable();
  return <SignupView apiReachable={apiReachable} />;
}
