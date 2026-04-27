import { redirect } from "next/navigation";

export default function AdminGroupsRedirectPage() {
  redirect("/admin/spaces");
}
