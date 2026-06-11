import { client } from "@/lib/server/backend-fetch";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { TENANT_ROLES } from "@/lib/constants/roles";
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
} from "./types";

type AuthHeaders = { Authorization: string };

export type AdminSpacesViewData = {
  canCreateSpace: boolean;
  currentUserId: string;
  fetchErrorStatus?: number;
  isSystemAdmin: boolean;
  spaces: SpaceListItem[];
  users: TenantUserSummary[];
};

export function statusFromResponse(response?: Pick<Response, "status">): number {
  return response?.status ?? 500;
}

export function isSystemAdminUser(user: Pick<AdminSpacesMe, "roles">): boolean {
  return user.roles.includes(TENANT_ROLES.admin);
}

export function canCreateSpace(user: Pick<AdminSpacesMe, "roles">): boolean {
  return isSystemAdminUser(user);
}

export function normalizeGroups(
  groups: AdminSpacesGroupsData["groups"],
): GroupSummary[] {
  return groups.map((group) => ({
    ...group,
    description: normalizeName(group.description),
  }));
}

export function normalizeMembers(
  members: AdminSpacesMembersData["members"],
): GroupMemberSummary[] {
  return members.map((member) => ({
    ...member,
    name: normalizeName(member.name),
  }));
}

export function normalizeAvailableUsers(
  users: AdminSpacesAvailableUsersData["users"],
): AvailableUserSummary[] {
  return users.map((user) => ({
    ...user,
    name: normalizeName(user.name),
  }));
}

export function normalizeTenantUsers(
  users: AdminSpacesUsersData["users"],
): TenantUserSummary[] {
  return users.map((user) => ({
    ...user,
    name: normalizeName(user.name),
  }));
}

export function canManageSpace({
  currentUserId,
  isSystemAdmin,
  members,
}: {
  currentUserId: string;
  isSystemAdmin: boolean;
  members: GroupMemberSummary[];
}): boolean {
  return (
    isSystemAdmin ||
    members.some(
      (member) => member.userId === currentUserId && member.role === "admin",
    )
  );
}

export function buildAdminSpaceListItems({
  availableUsersByGroup,
  currentUserId,
  groups,
  isSystemAdmin,
  membersByGroup,
}: {
  availableUsersByGroup: Map<string, AvailableUserSummary[]>;
  currentUserId: string;
  groups: GroupSummary[];
  isSystemAdmin: boolean;
  membersByGroup: Map<string, GroupMemberSummary[]>;
}): SpaceListItem[] {
  return groups.map((group) => {
    const members = membersByGroup.get(group.id) ?? [];
    return {
      group,
      members,
      addableUsers: availableUsersByGroup.get(group.id) ?? [],
      canManageSpace: canManageSpace({
        currentUserId,
        isSystemAdmin,
        members,
      }),
    };
  });
}

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
      client.GET("/groups", { headers: authHeaders }),
      canCreateSpaceValue
        ? client.GET("/users", { headers: authHeaders })
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

  for (const group of groups) {
    const [membersResponse, availableUsersResponse] = await Promise.all([
      client.GET("/groups/{groupId}/members", {
        params: { path: { groupId: group.id } },
        headers: authHeaders,
      }),
      client.GET("/groups/{groupId}/available-users", {
        params: { path: { groupId: group.id } },
        headers: authHeaders,
      }),
    ]);

    membersByGroup.set(
      group.id,
      !membersResponse.response.ok || !membersResponse.data
        ? []
        : normalizeMembers(
            unwrapResponseData<AdminSpacesMembersData>(membersResponse).members,
          ),
    );
    availableUsersByGroup.set(
      group.id,
      !availableUsersResponse.response.ok || !availableUsersResponse.data
        ? []
        : normalizeAvailableUsers(
            unwrapResponseData<AdminSpacesAvailableUsersData>(
              availableUsersResponse,
            ).users,
          ),
    );
  }

  return { availableUsersByGroup, membersByGroup };
}

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

function normalizeName(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
