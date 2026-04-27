import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/session";

export default async function HomePage() {
  const me = await getCurrentSessionUser();
  if (!me) {
    redirect("/login");
  }

  if (me.roles.includes("tenant_admin")) {
    redirect("/space");
  }
  if (me.roles.includes("approver")) {
    redirect("/review/applications");
  }
  redirect("/app/applications");
}
