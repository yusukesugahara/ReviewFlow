import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { AdminSpacesView } from "./view";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import {
  buildAdminSpaceListItems,
  canCreateSpace,
  isSystemAdminUser,
  normalizeAvailableUsers,
  normalizeGroups,
  normalizeMembers,
  normalizeTenantUsers,
  statusFromResponse,
} from "./admin-spaces-page-data";
import type {
  AdminSpacesAvailableUsersData,
  AdminSpacesGroupsData,
  AdminSpacesMe,
  AdminSpacesMembersData,
  AdminSpacesPageProps,
  AdminSpacesUsersData,
  AvailableUserSummary,
  GroupMemberSummary,
} from "./types";

export default async function AdminSpacesPage({ searchParams }: AdminSpacesPageProps) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  if (!accessToken) {
    redirect("/login");
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const meResponse = await client.POST("/auth/me", { headers: authHeaders });
  if (!meResponse.response.ok || !meResponse.data) {
    redirect("/login");
  }

  const me = unwrapResponseData<AdminSpacesMe>(meResponse);
  const isSystemAdmin = isSystemAdminUser(me);
  const canCreateSpaceValue = canCreateSpace(me);

  try {
    const [groupsResponse, usersResponse] = await Promise.all([
      client.GET("/groups", { headers: authHeaders }),
      canCreateSpaceValue
        ? client.GET("/users", { headers: authHeaders })
        : Promise.resolve(null),
    ]);

    if (!groupsResponse.response.ok || !groupsResponse.data) {
      return (
        <AdminSpacesView
          canCreateSpace={canCreateSpaceValue}
          currentUserId={me.id}
          formError={params.formError}
          fetchErrorStatus={statusFromResponse(groupsResponse.response)}
          isSystemAdmin={isSystemAdmin}
          spaces={[]}
          users={[]}
        />
      );
    }

    if (usersResponse && (!usersResponse.response.ok || !usersResponse.data)) {
      return (
        <AdminSpacesView
          canCreateSpace={canCreateSpaceValue}
          currentUserId={me.id}
          formError={params.formError}
          fetchErrorStatus={statusFromResponse(usersResponse.response)}
          isSystemAdmin={isSystemAdmin}
          spaces={[]}
          users={[]}
        />
      );
    }

    const groups = normalizeGroups(
      unwrapResponseData<AdminSpacesGroupsData>(groupsResponse).groups,
    );
    const users =
      usersResponse
        ? normalizeTenantUsers(
            unwrapResponseData<AdminSpacesUsersData>(usersResponse).users,
          )
        : [];
    const membersByGroup = new Map<string, GroupMemberSummary[]>();
    const availableUsersByGroup = new Map<string, AvailableUserSummary[]>();

    for (const group of groups) {
      const [membersResponse, availableUsersResponse] = await Promise.all([
        client.GET("/groups/{groupId}/members", {
          params: { path: { groupId: group.id } },
          headers: authHeaders,
        }),
        client.GET("/groups/{groupId}/available-users", {
          params: { path: { groupId: group.id } },
          headers: authHeaders,
        }),
      ]);

      membersByGroup.set(
        group.id,
        !membersResponse.response.ok || !membersResponse.data
          ? []
          : normalizeMembers(
              unwrapResponseData<AdminSpacesMembersData>(membersResponse)
                .members,
            ),
      );
      availableUsersByGroup.set(
        group.id,
        !availableUsersResponse.response.ok || !availableUsersResponse.data
          ? []
          : normalizeAvailableUsers(
              unwrapResponseData<AdminSpacesAvailableUsersData>(
                availableUsersResponse,
              ).users,
            ),
      );
    }

    return (
      <AdminSpacesView
        canCreateSpace={canCreateSpaceValue}
        currentUserId={me.id}
        error={params.error}
        formError={params.formError}
        isSystemAdmin={isSystemAdmin}
        spaces={buildAdminSpaceListItems({
          availableUsersByGroup,
          currentUserId: me.id,
          groups,
          isSystemAdmin,
          membersByGroup,
        })}
        users={users}
      />
    );
  } catch {
    return (
      <AdminSpacesView
        canCreateSpace={canCreateSpaceValue}
        currentUserId={me.id}
        formError={params.formError}
        fetchErrorStatus={500}
        isSystemAdmin={isSystemAdmin}
        spaces={[]}
        users={[]}
      />
    );
  }
}
