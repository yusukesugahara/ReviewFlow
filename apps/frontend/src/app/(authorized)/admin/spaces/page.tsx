import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { AdminSpacesView } from "./view";
import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { getAdminSpacesViewData } from "./admin-spaces-page-data";
import type { AdminSpacesMe, AdminSpacesPageProps } from "./types";

export default async function AdminSpacesPage({ searchParams }: AdminSpacesPageProps) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  if (!accessToken) {
    redirect("/login");
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const meResponse = await client.POST("/auth/me", { headers: authHeaders });
  if (!meResponse.response.ok || !meResponse.data) {
    redirect("/login");
  }

  const me = unwrapResponseData<AdminSpacesMe>(meResponse);
  const viewData = await getAdminSpacesViewData({ authHeaders, me });

  return (
    <AdminSpacesView
      {...viewData}
      error={params.error}
      formError={params.formError}
    />
  );
}
