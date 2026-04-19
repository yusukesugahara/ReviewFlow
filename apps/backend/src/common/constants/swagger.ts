/** `DocumentBuilder.addBearerAuth` と `@ApiBearerAuth` で揃える（Nest 発行 JWT） */
export const SWAGGER_JWT_AUTH_KEY = 'nest-jwt' as const;

/** `DocumentBuilder.addApiKey` と `@ApiSecurity` で揃える */
export const SWAGGER_API_KEY_NAME = 'internal-api-key' as const;
