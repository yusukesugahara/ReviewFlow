import { AdminSpacesView } from "./view";
import { getAdminSpacesPageData } from "./admin-spaces-page-data";
import type { AdminSpacesPageProps } from "./types";

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
