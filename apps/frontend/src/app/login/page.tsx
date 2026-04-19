import { LoginView } from "./view";
import { fetchApiOriginReachable } from "@/lib/server/fetch-api-origin-reachable";

export default async function LoginPage() {
  const apiReachable = await fetchApiOriginReachable();
  return <LoginView apiReachable={apiReachable} />;
}
