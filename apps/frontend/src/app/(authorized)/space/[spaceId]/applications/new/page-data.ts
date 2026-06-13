import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { ApprovalAssigneeOption } from "@/components/application-setup/form-builder/application-setup-draft-form";
import { TENANT_ROLES } from "@/lib/constants/roles";
import type {
  GroupMembersListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import { redirect } from "next/navigation";
import type {
  SpaceNewApplicationGroup,
  SpaceNewApplicationMember,
} from "./types";

export type SpaceNewApplicationPageData = {
  assignees: ApprovalAssigneeOption[];
  canManageSpace: boolean;
};

export async function getSpaceNewApplicationPageData({
  spaceId,
}: {
  spaceId: string;
}): Promise<SpaceNewApplicationPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [groupsRaw, me] = await Promise.all([
    client.GET("/groups", { headers: authHeaders }),
    getCurrentSessionUser(),
  ]);

  let groups: SpaceNewApplicationGroup[];
  try {
    groups = unwrapResponseData<GroupsListSuccessJson["data"]>(
      groupsRaw,
    ).groups as SpaceNewApplicationGroup[];
  } catch {
    redirect("/login");
  }

  const currentGroup = groups.find((group) => group.id === spaceId);
  const canManageSpace = Boolean(
    me?.roles.includes(TENANT_ROLES.admin) ||
      currentGroup?.currentUserRole === "admin",
  );

  return {
    assignees: canManageSpace
      ? await listApprovalAssignees({ headers: authHeaders, spaceId })
      : [],
    canManageSpace,
  };
}

async function listApprovalAssignees({
  headers,
  spaceId,
}: {
  headers: { Authorization: string };
  spaceId: string;
}): Promise<ApprovalAssigneeOption[]> {
  const membersRaw = await client.GET("/groups/{groupId}/members", {
    params: { path: { groupId: spaceId } },
    headers,
  });

  let members: SpaceNewApplicationMember[];
  try {
    members = unwrapResponseData<GroupMembersListSuccessJson["data"]>(
      membersRaw,
    ).members.map((member) => ({
      ...member,
      name: typeof member.name === "string" ? member.name : null,
    })) as SpaceNewApplicationMember[];
  } catch {
    redirect("/space");
  }

  return members.map((member) => ({
    id: member.userId,
    label: member.name ? `${member.name} (${member.email})` : member.email,
  }));
}
