export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupMemberSummary = {
  id: string;
  groupId: string;
  userId: string;
  email: string;
  name: string | null;
  role: "admin" | "user" | string;
  createdAt: string;
  updatedAt: string;
};

export type TenantUserSummary = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type AvailableUserSummary = {
  id: string;
  email: string;
  name: string | null;
};

export type SpaceListItem = {
  group: GroupSummary;
  members: GroupMemberSummary[];
  addableUsers: AvailableUserSummary[];
  canManageSpace: boolean;
};
