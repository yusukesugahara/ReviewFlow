import { isApiOriginReachable } from "@/lib/server/api-origin";
import { LogoutView } from "./view";

export default async function LogoutPage() {
  const apiReachable = await isApiOriginReachable();

  return <LogoutView apiReachable={apiReachable} />;
}
