import { AdminSpacesView } from "./view";
import { getAdminSpacesPageData } from "./_data/page-data";
import type { AdminSpacesPageProps } from "./types";

/**
 * 管理者向けスペース管理画面のデータを読み込んで表示します。
 */
export default async function AdminSpacesPage({ searchParams }: AdminSpacesPageProps) {
  const params = (await searchParams) ?? {};
  const viewData = await getAdminSpacesPageData();

  return (
    <AdminSpacesView
      {...viewData}
      error={params.error}
      formError={params.formError}
    />
  );
}
