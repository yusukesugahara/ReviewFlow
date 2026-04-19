import createClient from "openapi-fetch";
import { env } from "./env";
import type { paths } from "./api-schema";

/** `npm run generate:api-types` で `../backend/schema.json` から再生成 */
export const apiClient = createClient<paths>({
  baseUrl: env.NEXT_PUBLIC_API_URL,
});
