import "server-only";

import { NextResponse } from "next/server";

import { proxyBackendRequestTo } from "@/lib/server/proxy-backend-request";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext): Promise<NextResponse> {
  if (req.method !== "PATCH") {
    return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
  }
  const { id } = await context.params;
  return proxyBackendRequestTo(`/users/${id}/role`, req);
}
