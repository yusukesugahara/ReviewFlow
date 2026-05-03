import "server-only";

import { NextResponse } from "next/server";

import { proxyBackendRequestTo } from "@/lib/server/proxy-backend-request";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext): Promise<NextResponse> {
  if (req.method !== "POST") {
    return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
  }
  const { id } = await context.params;
  return proxyBackendRequestTo(`/form-definitions/${id}/fields`, req);
}
