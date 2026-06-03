export const GroupMemberRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type GroupMemberRoleValue =
  (typeof GroupMemberRole)[keyof typeof GroupMemberRole];

export const GROUP_MEMBER_ROLES = Object.values(GroupMemberRole);
