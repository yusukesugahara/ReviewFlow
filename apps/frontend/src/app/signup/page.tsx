import { SignupView } from "./view";
import { isApiOriginReachable } from "@/lib/server/api-origin";

export default async function SignupPage() {
  const apiReachable = await isApiOriginReachable();
  return <SignupView apiReachable={apiReachable} />;
}
