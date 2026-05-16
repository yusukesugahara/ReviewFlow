import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { SpaceEmptyState } from "@/app/space/_components/space-empty-state";
import { getAccessTokenFromCookie, getCurrentSessionUser } from "@/lib/server/session";

type PageProps = {
  searchParams?: Promise<{ status?: string; spaceId?: string }>;
};

type Space = {
  id: string;
};

export default async function LegacySpaceApplicationsPage({
  searchParams,
}: PageProps) {
  const query = (await searchParams) ?? {};
  const { spaceId, userRoles } = await getFallbackSpaceContext();
  const resolvedSpaceId = query.spaceId ?? spaceId;
  if (!resolvedSpaceId) {
    return <SpaceEmptyState userRoles={userRoles} />;
  }
  const params = new URLSearchParams();

  if (query.status) {
    params.set("status", query.status);
  }

  redirect(
    `/space/${encodeURIComponent(resolvedSpaceId)}/applications${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
  );
}

async function getFallbackSpaceContext(): Promise<{
  spaceId: string;
  userRoles: string[];
}> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  const [spacesRaw, me] = await Promise.all([
    client.GET("/groups", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    getCurrentSessionUser(),
  ]);
  const spaces =
    spacesRaw.response.ok && spacesRaw.data
      ? unwrapData<{ groups?: Space[] }>(spacesRaw.data).groups ?? []
      : [];
  return { spaceId: spaces[0]?.id ?? "", userRoles: me?.roles ?? [] };
}
