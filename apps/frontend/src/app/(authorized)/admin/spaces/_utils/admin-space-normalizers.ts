import type {
  AdminSpacesAvailableUsersData,
  AdminSpacesGroupsData,
  AdminSpacesMembersData,
  AdminSpacesUsersData,
  AvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
  TenantUserSummary,
} from "../types";

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

function normalizeName(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
