import { client } from "@/lib/relay/client";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canCreateSpace, isSystemAdminUser } from "../_rules/space-access-rules";
import {
  normalizeAvailableUsers,
  normalizeGroups,
  normalizeMembers,
  normalizeTenantUsers,
} from "../_utils/admin-space-normalizers";
import { buildAdminSpaceListItems } from "../_view-models/admin-space-list-items";
import type {
  AdminSpacesAvailableUsersData,
  AdminSpacesGroupsData,
  AdminSpacesMe,
  AdminSpacesMembersData,
  AdminSpacesUsersData,
  AvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
  SpaceListItem,
  TenantUserSummary,
} from "../types";

type AuthHeaders = { Authorization: string };

export type AdminSpacesViewData = {
  canCreateSpace: boolean;
  currentUserId: string;
  fetchErrorStatus?: number;
  isSystemAdmin: boolean;
  spaces: SpaceListItem[];
  users: TenantUserSummary[];
};

/**
 * 現在のセッションを確認し、管理者向けスペース画面のデータを読み込みます。
 */
export async function getAdminSpacesPageData(): Promise<AdminSpacesViewData> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  if (!accessToken) {
    redirect("/login");
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const meResponse = await client.me( { headers: authHeaders });
  if (!meResponse.response.ok || !meResponse.data) {
    redirect("/login");
  }

  return getAdminSpacesViewData({
    authHeaders,
    me: unwrapResponseData<AdminSpacesMe>(meResponse),
  });
}

/**
 * エラー表示に使う HTTP ステータスを返し、不明な失敗は 500 として扱います。
 */
export function statusFromResponse(response?: Pick<Response, "status">): number {
  return response?.status ?? 500;
}

/**
 * 認証済みユーザー向けに管理者向けスペース画面の表示データを取得して組み立てます。
 */
export async function getAdminSpacesViewData({
  authHeaders,
  me,
}: {
  authHeaders: AuthHeaders;
  me: AdminSpacesMe;
}): Promise<AdminSpacesViewData> {
  const isSystemAdmin = isSystemAdminUser(me);
  const canCreateSpaceValue = canCreateSpace(me);

  try {
    const [groupsResponse, usersResponse] = await Promise.all([
      client.groups( { headers: authHeaders }),
      canCreateSpaceValue
        ? client.users( { headers: authHeaders })
        : Promise.resolve(null),
    ]);

    if (!groupsResponse.response.ok || !groupsResponse.data) {
      return buildAdminSpacesErrorViewData({
        canCreateSpace: canCreateSpaceValue,
        currentUserId: me.id,
        fetchErrorStatus: statusFromResponse(groupsResponse.response),
        isSystemAdmin,
      });
    }

    if (usersResponse && (!usersResponse.response.ok || !usersResponse.data)) {
      return buildAdminSpacesErrorViewData({
        canCreateSpace: canCreateSpaceValue,
        currentUserId: me.id,
        fetchErrorStatus: statusFromResponse(usersResponse.response),
        isSystemAdmin,
      });
    }

    const groups = normalizeGroups(
      unwrapResponseData<AdminSpacesGroupsData>(groupsResponse).groups,
    );
    const users =
      usersResponse
        ? normalizeTenantUsers(
            unwrapResponseData<AdminSpacesUsersData>(usersResponse).users,
          )
        : [];
    const { availableUsersByGroup, membersByGroup } =
      await getAdminSpaceMembersByGroup({ authHeaders, groups });

    return {
      canCreateSpace: canCreateSpaceValue,
      currentUserId: me.id,
      isSystemAdmin,
      spaces: buildAdminSpaceListItems({
        availableUsersByGroup,
        currentUserId: me.id,
        groups,
        isSystemAdmin,
        membersByGroup,
      }),
      users,
    };
  } catch {
    return buildAdminSpacesErrorViewData({
      canCreateSpace: canCreateSpaceValue,
      currentUserId: me.id,
      fetchErrorStatus: 500,
      isSystemAdmin,
    });
  }
}

/**
 * 表示対象スペースごとにメンバー一覧と追加可能ユーザー一覧を取得します。
 */
async function getAdminSpaceMembersByGroup({
  authHeaders,
  groups,
}: {
  authHeaders: AuthHeaders;
  groups: GroupSummary[];
}): Promise<{
  availableUsersByGroup: Map<string, AvailableUserSummary[]>;
  membersByGroup: Map<string, GroupMemberSummary[]>;
}> {
  const membersByGroup = new Map<string, GroupMemberSummary[]>();
  const availableUsersByGroup = new Map<string, AvailableUserSummary[]>();

  const groupMemberships = await Promise.all(
    groups.map(async (group) => {
      const [membersResponse, availableUsersResponse] = await Promise.all([
        client.groupMembers( {
          params: { path: { groupId: group.id } },
          headers: authHeaders,
        }),
        client.groupAvailableUsers( {
          params: { path: { groupId: group.id } },
          headers: authHeaders,
        }),
      ]);

      return {
        groupId: group.id,
        members:
          !membersResponse.response.ok || !membersResponse.data
            ? []
            : normalizeMembers(
                unwrapResponseData<AdminSpacesMembersData>(membersResponse).members,
              ),
        availableUsers:
          !availableUsersResponse.response.ok || !availableUsersResponse.data
            ? []
            : normalizeAvailableUsers(
                unwrapResponseData<AdminSpacesAvailableUsersData>(
                  availableUsersResponse,
                ).users,
              ),
      };
    }),
  );

  for (const groupMembership of groupMemberships) {
    membersByGroup.set(groupMembership.groupId, groupMembership.members);
    availableUsersByGroup.set(
      groupMembership.groupId,
      groupMembership.availableUsers,
    );
  }

  return { availableUsersByGroup, membersByGroup };
}

/**
 * ページデータ取得に失敗したときのエラー表示データを組み立てます。
 */
function buildAdminSpacesErrorViewData({
  canCreateSpace,
  currentUserId,
  fetchErrorStatus,
  isSystemAdmin,
}: {
  canCreateSpace: boolean;
  currentUserId: string;
  fetchErrorStatus: number;
  isSystemAdmin: boolean;
}): AdminSpacesViewData {
  return {
    canCreateSpace,
    currentUserId,
    fetchErrorStatus,
    isSystemAdmin,
    spaces: [],
    users: [],
  };
}
