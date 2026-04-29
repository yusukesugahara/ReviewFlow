import "server-only";

import type { components } from "@/lib/api-schema";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { unwrapData } from "@/lib/server/api-envelope";

export type TenantUserSummary =
  components["schemas"]["TenantUserSummaryDto"];
export type UpdateUserRoleInput = components["schemas"]["UpdateUserRoleDto"];

type TenantUsersListResponse =
  components["schemas"]["TenantUsersListResponseDto"];

export async function listTenantUsers(): Promise<TenantUserSummary[]> {
  const raw = await backendAuthFetchJson("/users");
  return unwrapData<TenantUsersListResponse>(raw).users;
}

export async function updateTenantUserRole(
  userId: string,
  input: UpdateUserRoleInput,
): Promise<TenantUserSummary> {
  const raw = await backendAuthFetchJson(`/users/${userId}/role`, {
    method: "PATCH",
    body: input,
  });
  return unwrapData<TenantUserSummary>(raw);
}
