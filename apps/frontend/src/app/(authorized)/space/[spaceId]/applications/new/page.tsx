import type { ApprovalAssigneeOption } from "@/app/(authorized)/space/_components/application-setup-draft-form";
import { buildSpaceApplicationNewHref } from "@/app/_components/applications/application-routes";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { TENANT_ROLES } from "@/lib/constants/roles";
import { unwrapData } from "@/lib/server/api-envelope";
import type { GroupMembersListSuccessJson, GroupsListSuccessJson } from "@/lib/schema";
import type {
  SpaceNewApplicationGroup,
  SpaceNewApplicationMember,
  SpaceNewApplicationPageProps,
} from "./types";
import { SpaceNewApplicationView } from "./view";

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

export default async function SpaceNewApplicationPage({
  params,
  searchParams,
}: SpaceNewApplicationPageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Awaited<NonNullable<SpaceNewApplicationPageProps["searchParams"]>>),
  ]);
  const newApplicationHref = buildSpaceApplicationNewHref(spaceId);
  const authHeaders = await authHeadersOrRedirect();

  const [groupsRaw, me] = await Promise.all([
    client.GET("/groups", { headers: authHeaders }),
    getCurrentSessionUser(),
  ]);
  const groupsData: GroupsListSuccessJson | undefined = groupsRaw.data;
  if (!groupsRaw.response.ok || !groupsData) {
    redirect("/login");
  }
  const groups = unwrapData<GroupsListSuccessJson["data"]>(groupsData)
    .groups as SpaceNewApplicationGroup[];
  const currentGroup = groups.find((group) => group.id === spaceId);
  const canManageSpace =
    me?.roles.includes(TENANT_ROLES.admin) ||
    currentGroup?.currentUserRole === "admin";
  let assignees: ApprovalAssigneeOption[] = [];
  if (canManageSpace) {
    const membersRaw = await client.GET("/groups/{groupId}/members", {
      params: { path: { groupId: spaceId } },
      headers: authHeaders,
    });
    const membersData: GroupMembersListSuccessJson | undefined = membersRaw.data;
    if (!membersRaw.response.ok || !membersData) {
      redirect("/space");
    }
    const members =
      unwrapData<GroupMembersListSuccessJson["data"]>(membersData)
        .members.map((member) => ({
          ...member,
          name: typeof member.name === "string" ? member.name : null,
        })) as SpaceNewApplicationMember[];
    assignees = members.map((member) => ({
      id: member.userId,
      label: member.name ? `${member.name} (${member.email})` : member.email,
    }));
  }

  return (
    <SpaceNewApplicationView
      assignees={assignees}
      canManageSpace={Boolean(canManageSpace)}
      newApplicationHref={newApplicationHref}
      publishedFormDefinitionId={query.publishedFormDefinitionId ?? null}
      publishedGroupId={query.publishedGroupId ?? null}
      setupError={query.setupError}
      setupErrorDetail={query.setupErrorDetail}
      setupStatus={query.setupStatus}
      spaceId={spaceId}
    />
  );
}
