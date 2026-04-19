import "server-only";

import { createAuthProxyRouteHandler } from "@/lib/server/proxy-backend-request";

export const GET = createAuthProxyRouteHandler("GET", "/approval-flows");
export const POST = createAuthProxyRouteHandler("POST", "/approval-flows");
