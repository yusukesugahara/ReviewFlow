import "server-only";

import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { TenantUsersListResponse } from "@/lib/schema";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { isApiFailure } from "@/lib/server/api-failure";
import { client } from "@/lib/relay/client";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import type { AdminInvitationsViewProps } from "../types";

/**
 * 管理者向け招待画面に必要なユーザー一覧と現在ユーザー情報を読み込みます。
 */
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
      client.users( {
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

/**
 * ユーザー一覧取得失敗時の画面表示メッセージを組み立てます。
 */
function userListErrorMessage(error: unknown): string {
  return isApiFailure(error)
    ? `ユーザ一覧の取得に失敗しました（status: ${error.status}）`
    : "ユーザ一覧の取得に失敗しました";
}
