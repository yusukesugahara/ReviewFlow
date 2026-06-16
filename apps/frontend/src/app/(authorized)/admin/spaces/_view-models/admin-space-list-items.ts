import { canManageSpace } from "../_rules/space-access-rules";
import type {
  AvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
  SpaceListItem,
} from "../types";

/**
 * スペース、メンバー、追加可能ユーザー、権限を一覧表示用の項目にまとめます。
 */
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
