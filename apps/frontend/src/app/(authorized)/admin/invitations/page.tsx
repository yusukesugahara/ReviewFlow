import { getAdminInvitationsPageData } from "./_data/page-data";
import type { AdminInvitationsPageProps } from "./types";
import { AdminInvitationsView } from "./view";

export default async function AdminInvitationsPage({
  searchParams,
}: AdminInvitationsPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getAdminInvitationsPageData();

  return <AdminInvitationsView {...params} {...data} />;
}
