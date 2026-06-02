import type {
  GroupAvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
} from "@/lib/schema";

export type SpaceUsersPageProps = {
  searchParams?: Promise<{
    spaceId?: string;
    error?: string;
    formError?: string;
  }>;
};

export type SpaceUsersApiFailure = { status: number };

export type SpaceUsersGroup = GroupSummary;

export type SpaceUsersMember = Omit<GroupMemberSummary, "name"> & {
  name: string | null;
};

export type SpaceUsersAvailableUser = Omit<GroupAvailableUserSummary, "name"> & {
  name: string | null;
};

export type SpaceUsersViewProps = {
  availableUsers: SpaceUsersAvailableUser[];
  currentUserId: string | null;
  error?: string;
  formError?: string;
  isTenantAdmin: boolean;
  members: SpaceUsersMember[];
  spaceId: string;
  spaceName: string;
};

export type SpaceUsersErrorViewProps = {
  status?: number;
};
