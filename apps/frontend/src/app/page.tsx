import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/session";

export default async function HomePage() {
  const me = await getCurrentSessionUser();
  if (!me) {
    redirect("/login");
  }

  if (me.roles.includes("platform_admin")) {
    redirect("/admin/spaces");
  }
  if (me.roles.includes("tenant_admin")) {
    redirect("/admin/spaces");
  }
  redirect("/app/applications");
}
