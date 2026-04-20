import "server-only";

import { createAuthProxyRouteHandler } from "@/lib/server/proxy-backend-request";

export const GET = createAuthProxyRouteHandler("GET", "/audit-logs");
