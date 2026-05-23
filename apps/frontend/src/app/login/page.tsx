import { LoginView } from "./view";
import { getServerApiBaseUrl } from "@/lib/env";
import type { LoginPageProps } from "./types";

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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const apiReachable = await fetchApiOriginReachable();
  const params = (await searchParams) ?? {};
  return <LoginView apiReachable={apiReachable} next={params.next} />;
}
