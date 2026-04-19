import "server-only";

import { NextResponse } from "next/server";

import { getServerAuthEnv } from "@/lib/env";

export type AuthNestPath =
  | "/auth/register"
  | "/auth/login"
  | "/auth/me"
  | "/auth/admin/ping"
  | "/invitations"
  | "/invitations/accept";

type ProxyHttpMethod = "GET" | "POST";

/**
 * ブラウザは同オリジンの `/api/auth/*` のみ叩き、サーバー側で Nest に転送する（INTERNAL_API_KEY はここでのみ付与）。
 */
export async function proxyBackendRequest(
  nestPath: AuthNestPath,
  req: Request,
): Promise<NextResponse> {
  const env = getServerAuthEnv();
  const url = `${env.apiBaseUrl}${nestPath}`;

  const headers = new Headers();
  headers.set("X-API-Key", env.INTERNAL_API_KEY);
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const auth = req.headers.get("authorization");
  if (auth) {
    headers.set("Authorization", auth);
  }

  const method = req.method;
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const res = await fetch(url, { method, headers, body });

  const out = new NextResponse(await res.arrayBuffer(), { status: res.status });
  const ct = res.headers.get("content-type");
  if (ct) {
    out.headers.set("content-type", ct);
  }
  return out;
}

export function createAuthProxyRouteHandler(
  method: ProxyHttpMethod,
  nestPath: AuthNestPath,
) {
  return async (req: Request): Promise<NextResponse> => {
    if (req.method !== method) {
      return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
    }
    return proxyBackendRequest(nestPath, req);
  };
}
