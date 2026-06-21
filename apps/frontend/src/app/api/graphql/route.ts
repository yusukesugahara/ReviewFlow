import { NextResponse } from "next/server";
import { getServerAuthEnv } from "@/lib/server/env";
import { getAccessTokenFromCookie } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Browser Relay からの GraphQL リクエストにサーバー側の認証情報を付与して Nest へ中継します。
 */
export async function POST(request: Request) {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    return graphqlErrorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return graphqlErrorResponse("Invalid GraphQL request body", 400);
  }

  const authEnv = getServerAuthEnv();
  let response: Response;
  try {
    response = await fetch(`${authEnv.apiBaseUrl}/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-API-Key": authEnv.INTERNAL_API_KEY,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return graphqlErrorResponse("GraphQL API is unavailable", 503);
  }

  const responseBody = await response.text();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

function graphqlErrorResponse(message: string, status: number) {
  return NextResponse.json({ errors: [{ message }] }, { status });
}
