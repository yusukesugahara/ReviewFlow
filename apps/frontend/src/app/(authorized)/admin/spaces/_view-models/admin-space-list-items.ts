import { canManageSpace } from "../_rules/space-access-rules";
import type {
  AvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
  SpaceListItem,
} from "../types";

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
