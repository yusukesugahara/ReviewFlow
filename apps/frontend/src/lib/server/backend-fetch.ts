import "server-only";

import createClient from "openapi-fetch";
import type { paths } from "@/lib/api-schema";
import { getServerApiBaseUrl, getServerAuthEnv } from "@/lib/env";

export const client = createClient<paths>({
  baseUrl: getServerApiBaseUrl(),
  headers: {
    "X-API-Key": getServerAuthEnv().INTERNAL_API_KEY,
  },
});
