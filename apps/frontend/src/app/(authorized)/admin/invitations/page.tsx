import { client } from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { TenantUserSummary, TenantUsersListResponse } from "@/lib/schema";
import type { AdminInvitationsPageProps } from "./types";
import { AdminInvitationsView } from "./view";

export default async function AdminInvitationsPage({
  searchParams,
}: AdminInvitationsPageProps) {
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
        ? `ユーザ一覧の取得に失敗しました（status: ${error}）`
        : "ユーザ一覧の取得に失敗しました";
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
