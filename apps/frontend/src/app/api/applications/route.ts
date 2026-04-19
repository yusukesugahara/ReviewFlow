import "server-only";

import { createAuthProxyRouteHandler } from "@/lib/server/proxy-backend-request";

export const GET = createAuthProxyRouteHandler("GET", "/applications");
export const POST = createAuthProxyRouteHandler("POST", "/applications");
