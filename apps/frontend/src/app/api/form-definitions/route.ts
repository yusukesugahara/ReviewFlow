import { createAuthProxyRouteHandler } from "@/lib/server/proxy-backend-request";

export const GET = createAuthProxyRouteHandler("GET", "/form-definitions");
export const POST = createAuthProxyRouteHandler("POST", "/form-definitions");
