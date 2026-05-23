import type {
  AuthMeSuccessJson,
  GroupAvailableUsersSuccessJson,
  GroupAvailableUserSummary,
  GroupMembersListSuccessJson,
  GroupMemberSummary as ApiGroupMemberSummary,
  GroupsListSuccessJson,
  GroupSummary as ApiGroupSummary,
  TenantUserSummary as ApiTenantUserSummary,
  TenantUsersListResponse,
} from "@/lib/schema";

export type AdminSpacesPageProps = {
  searchParams?: Promise<{
    error?: string;
    formError?: string;
  }>;
};

export type AdminSpacesMe = AuthMeSuccessJson["data"];
export type AdminSpacesGroupsData = GroupsListSuccessJson["data"];
export type AdminSpacesUsersData = TenantUsersListResponse;
export type AdminSpacesMembersData = GroupMembersListSuccessJson["data"];
export type AdminSpacesAvailableUsersData = GroupAvailableUsersSuccessJson["data"];

export type GroupSummary = Omit<ApiGroupSummary, "description"> & {
  description?: string | null;
  currentUserRole?: "admin" | "user" | null;
};

export type GroupMemberSummary = Omit<ApiGroupMemberSummary, "name" | "role"> & {
  name: string | null;
  role: "admin" | "user";
};

export type TenantUserSummary = Omit<ApiTenantUserSummary, "name"> & {
  name: string | null;
};

export type AvailableUserSummary = Omit<GroupAvailableUserSummary, "name"> & {
  name: string | null;
};

export type SpaceListItem = {
  group: GroupSummary;
  members: GroupMemberSummary[];
  addableUsers: AvailableUserSummary[];
  canManageSpace: boolean;
};
