import { SignupView } from "./view";
import { fetchApiOriginReachable } from "@/lib/server/fetch-api-origin-reachable";

export default async function SignupPage() {
  const apiReachable = await fetchApiOriginReachable();
  return <SignupView apiReachable={apiReachable} />;
}
