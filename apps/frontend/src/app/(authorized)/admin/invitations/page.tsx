import { getAdminInvitationsPageData } from "./_data/page-data";
import type { AdminInvitationsPageProps } from "./types";
import { AdminInvitationsView } from "./view";

/**
 * 管理者向け招待管理画面のデータを読み込んで表示します。
 */
export default async function AdminInvitationsPage({
  searchParams,
}: AdminInvitationsPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getAdminInvitationsPageData();

  return <AdminInvitationsView {...params} {...data} />;
}
