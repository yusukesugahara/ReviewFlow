import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { ApprovalAssigneeOption } from "@/components/application-setup/form-builder/application-setup-draft-form";
import type {
  GroupMembersListSuccessJson,
  GroupsListSuccessJson,
} from "@/lib/schema";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/relay/client";
import { redirect } from "next/navigation";
import type {
  SpaceNewApplicationGroup,
  SpaceNewApplicationMember,
} from "../types";
import { canManageSpaceForNewApplication } from "../_rules/space-new-application-access";
import { toApprovalAssigneeOptions } from "../_view-models/approval-assignee-options";

export type SpaceNewApplicationPageData = {
  assignees: ApprovalAssigneeOption[];
  canManageSpace: boolean;
};

/**
 * スペースの新規申請画面を表示するためのデータを読み込みます。
 */
export async function getSpaceNewApplicationPageData({
  spaceId,
}: {
  spaceId: string;
}): Promise<SpaceNewApplicationPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const [groupsRaw, me] = await Promise.all([
    client.groups( { headers: authHeaders }),
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
  const canManageSpace = canManageSpaceForNewApplication({
    currentGroup,
    user: me,
  });

  return {
    assignees: canManageSpace
      ? await listApprovalAssignees({ headers: authHeaders, spaceId })
      : [],
    canManageSpace,
  };
}

/**
 * スペース内で承認担当者として選択できるメンバーを取得します。
 */
async function listApprovalAssignees({
  headers,
  spaceId,
}: {
  headers: { Authorization: string };
  spaceId: string;
}): Promise<ApprovalAssigneeOption[]> {
  const membersRaw = await client.groupMembers( {
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

  return toApprovalAssigneeOptions(members);
}
