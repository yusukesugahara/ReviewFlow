/** `@Api()` が付いたハンドラでは JWT（およびロール）検証をスキップする */
export const SKIP_JWT_KEY = 'skipJwt';

/** `X-API-Key` を要求しないルート（例: `/health`） */
export const SKIP_INTERNAL_API_KEY = 'skipInternalApiKey';

/** `@Roles()` のメタデータキー */
export const ROLES_KEY = 'roles';
