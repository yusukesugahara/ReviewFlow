import { getCurrentSessionUser } from "@/lib/server/session";
import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";
import { AdminSpacesView } from "./view";
import { TENANT_ROLES } from "@/lib/constants/roles";
import type {
  AvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
  TenantUserSummary,
} from "./types";

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function fetchGroupMembers(
  groupId: string,
): Promise<GroupMemberSummary[]> {
  try {
    const raw = await backendAuthFetchJson(`/groups/${groupId}/members`);
    return unwrapData<{ members?: GroupMemberSummary[] }>(raw).members ?? [];
  } catch (error) {
    if (error instanceof BackendHttpError && error.status === 403) {
      return [];
    }
    throw error;
  }
}

async function fetchAvailableUsers(
  groupId: string,
): Promise<AvailableUserSummary[]> {
  try {
    const raw = await backendAuthFetchJson(
      `/groups/${groupId}/available-users`,
    );
    return unwrapData<{ users?: AvailableUserSummary[] }>(raw).users ?? [];
  } catch (error) {
    if (error instanceof BackendHttpError && error.status === 403) {
      return [];
    }
    throw error;
  }
}

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    formError?: string;
  }>;
};

export default async function AdminSpacesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const me = await getCurrentSessionUser();
  const isSystemAdmin = me?.roles.includes(TENANT_ROLES.admin) ?? false;
  const canCreateSpace = isSystemAdmin;

  try {
    const [groupsRaw, usersRaw] = await Promise.all([
      backendAuthFetchJson("/groups"),
      canCreateSpace ? backendAuthFetchJson("/users") : Promise.resolve(null),
    ]);
    const groups =
      unwrapData<{ groups?: GroupSummary[] }>(groupsRaw).groups ?? [];
    const users = usersRaw
      ? (unwrapData<{ users?: TenantUserSummary[] }>(usersRaw).users ?? [])
      : [];
    const membersByGroup = new Map<string, GroupMemberSummary[]>();
    const availableUsersByGroup = new Map<string, AvailableUserSummary[]>();

    for (const group of groups) {
      const [members, availableUsers] = await Promise.all([
        fetchGroupMembers(group.id),
        fetchAvailableUsers(group.id),
      ]);
      membersByGroup.set(group.id, members);
      availableUsersByGroup.set(group.id, availableUsers);
    }

    return (
      <AdminSpacesView
        canCreateSpace={canCreateSpace}
        currentUserId={me?.id ?? null}
        error={params.error}
        formError={params.formError}
        isSystemAdmin={isSystemAdmin}
        spaces={groups.map((group) => {
          const members = membersByGroup.get(group.id) ?? [];
          return {
            group,
            members,
            addableUsers: availableUsersByGroup.get(group.id) ?? [],
            canManageSpace:
              isSystemAdmin ||
              members.some(
                (member) => member.userId === me?.id && member.role === "admin",
              ),
          };
        })}
        users={users}
      />
    );
  } catch (error) {
    return (
      <AdminSpacesView
        canCreateSpace={canCreateSpace}
        currentUserId={me?.id ?? null}
        formError={params.formError}
        fetchErrorStatus={error instanceof BackendHttpError ? error.status : 500}
        isSystemAdmin={isSystemAdmin}
        spaces={[]}
        users={[]}
      />
    );
  }
}
