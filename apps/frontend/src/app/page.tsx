import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { TENANT_ROLES } from "@/lib/constants/roles";

export default async function RootRedirectPage() {
  const me = await getCurrentSessionUser();
  if (!me) {
    redirect("/login");
  }

  if (me.roles.includes(TENANT_ROLES.admin)) {
    redirect("/admin/spaces");
  }
  redirect("/space");
}
