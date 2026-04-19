import { createAuthProxyRouteHandler } from "@/lib/server/proxy-backend-request";

export const POST = createAuthProxyRouteHandler("POST", "/auth/me");
