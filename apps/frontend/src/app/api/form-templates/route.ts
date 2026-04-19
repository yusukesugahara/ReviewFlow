import { createAuthProxyRouteHandler } from "@/lib/server/proxy-backend-request";

export const GET = createAuthProxyRouteHandler("GET", "/form-templates");
export const POST = createAuthProxyRouteHandler("POST", "/form-templates");
