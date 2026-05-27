import "server-only";

import createClient from "openapi-fetch";
import type { ApiPaths } from "@/lib/schema";
import { getServerApiBaseUrl, getServerAuthEnv } from "@/lib/env";

export const client = createClient<ApiPaths>({
  baseUrl: getServerApiBaseUrl(),
  headers: {
    "X-API-Key": getServerAuthEnv().INTERNAL_API_KEY,
  },
});
