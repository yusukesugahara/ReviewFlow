import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/session";
import { TENANT_ROLES } from "@/lib/constants/roles";

export default async function HomePage() {
  const me = await getCurrentSessionUser();
  if (!me) {
    redirect("/login");
  }

  if (me.roles.includes(TENANT_ROLES.admin)) {
    redirect("/admin/spaces");
  }
  redirect("/space");
}
