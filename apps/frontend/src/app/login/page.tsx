import { LoginView } from "./view";
import { isApiOriginReachable } from "@/lib/server/api-origin";
import type { LoginPageProps } from "./types";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const apiReachable = await isApiOriginReachable();
  const params = (await searchParams) ?? {};
  return <LoginView apiReachable={apiReachable} next={params.next} />;
}
