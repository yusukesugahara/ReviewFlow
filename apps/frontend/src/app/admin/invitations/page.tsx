import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getAccessTokenFromCookie, getCurrentSessionUser } from "@/lib/server/session";
import type { TenantUserSummary, TenantUsersListResponse } from "@/lib/schema";
import { AdminInvitationsView } from "./view";

type PageProps = {
  searchParams?: Promise<{
    sent?: string;
    email?: string;
    role?: string;
    expiresAt?: string;
    error?: string;
    formError?: string;
  }>;
};

export default async function AdminInvitationsPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return (
      <AdminInvitationsView
        {...params}
        currentUserId={null}
        userListError="ログインが必要です"
        users={[] satisfies TenantUserSummary[]}
      />
    );
  }

  try {
    const [response, me] = await Promise.all([
      client.GET("/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      getCurrentSessionUser(),
    ]);
    if (!response.response.ok || !response.data) {
      throw response.response.status;
    }
    const users = unwrapData<TenantUsersListResponse>(response.data).users;
    return (
      <AdminInvitationsView
        {...params}
        currentUserId={me?.id ?? null}
        users={users}
      />
    );
  } catch (error) {
    const message =
      typeof error === "number"
        ? `ユーザー一覧の取得に失敗しました（status: ${error}）`
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
