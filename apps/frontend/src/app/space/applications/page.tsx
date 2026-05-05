import { redirect } from "next/navigation";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { SpaceEmptyState } from "@/features/spaces/components/space-empty-state";
import { getCurrentSessionUser } from "@/lib/server/session";

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
  const [spacesRaw, me] = await Promise.all([
    backendAuthFetchJson("/groups"),
    getCurrentSessionUser(),
  ]);
  const spaces = unwrapData<{ groups?: Space[] }>(spacesRaw).groups ?? [];
  return { spaceId: spaces[0]?.id ?? "", userRoles: me?.roles ?? [] };
}
