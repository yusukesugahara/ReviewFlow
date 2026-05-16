import {
  backendAuthFetchJson,
  BackendHttpError,
} from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/lib/server/session";
import type { TenantUserSummary, TenantUsersListResponse } from "@/lib/schema";
import { AdminInvitationsView } from "./view";

type PageProps = {
  searchParams?: Promise<{
    sent?: string;
    email?: string;
    role?: string;
    expiresAt?: string;
    error?: string;
  }>;
};

export default async function AdminInvitationsPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};

  try {
    const [raw, me] = await Promise.all([
      backendAuthFetchJson("/users"),
      getCurrentSessionUser(),
    ]);
    const users = unwrapData<TenantUsersListResponse>(raw).users;
    return (
      <AdminInvitationsView
        {...params}
        currentUserId={me?.id ?? null}
        users={users}
      />
    );
  } catch (error) {
    const message =
      error instanceof BackendHttpError
        ? `ユーザー一覧の取得に失敗しました（status: ${error.status}）`
        : "ユーザー一覧の取得に失敗しました";
    return (
      <AdminInvitationsView
        {...params}
        currentUserId={null}
        userListError={message}
        users={[] satisfies TenantUserSummary[]}
      />
    );
  }
}
