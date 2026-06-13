import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { TenantUsersListResponse } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { isApiFailure } from "@/lib/server/api-failure";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AdminInvitationsViewProps } from "../types";

export async function getAdminInvitationsPageData(): Promise<
  Pick<AdminInvitationsViewProps, "currentUserId" | "userListError" | "users">
> {
  const accessToken = await getAccessTokenFromCookie();

  if (!accessToken) {
    return {
      currentUserId: null,
      userListError: "ログインが必要です",
      users: [],
    };
  }

  try {
    const [response, me] = await Promise.all([
      client.GET("/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      getCurrentSessionUser(),
    ]);

    return {
      currentUserId: me?.id ?? null,
      users: unwrapResponseData<TenantUsersListResponse>(response).users,
    };
  } catch (error) {
    return {
      currentUserId: null,
      userListError: userListErrorMessage(error),
      users: [],
    };
  }
}

function userListErrorMessage(error: unknown): string {
  return isApiFailure(error)
    ? `ユーザ一覧の取得に失敗しました（status: ${error.status}）`
    : "ユーザ一覧の取得に失敗しました";
}
