import "server-only";

import { createAuthProxyRouteHandler } from "@/lib/server/proxy-backend-request";

export const POST = createAuthProxyRouteHandler("POST", "/export-jobs");
