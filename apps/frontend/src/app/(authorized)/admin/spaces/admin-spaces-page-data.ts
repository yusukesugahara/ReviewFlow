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

function normalizeName(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
