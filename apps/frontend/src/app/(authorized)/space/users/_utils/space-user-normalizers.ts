import type {
  GroupAvailableUsersSuccessJson,
  GroupMembersListSuccessJson,
} from "@/lib/schema";
import type { SpaceUsersAvailableUser, SpaceUsersMember } from "../types";

export function normalizeSpaceMembers(
  members: GroupMembersListSuccessJson["data"]["members"],
): SpaceUsersMember[] {
  return members.map((member) => ({
    ...member,
    name: normalizeName(member.name),
  }));
}

export function normalizeAvailableUsers(
  users: GroupAvailableUsersSuccessJson["data"]["users"],
): SpaceUsersAvailableUser[] {
  return users.map((user) => ({
    ...user,
    name: normalizeName(user.name),
  }));
}

function normalizeName(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
