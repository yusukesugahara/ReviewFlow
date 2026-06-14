import { configurePostgresTestEnv } from '../test-postgres';

process.env.INTERNAL_API_KEY = 'e2e-internal-api-key';
process.env.JWT_SECRET = 'e2e-jwt-secret-at-least-32-characters-long';
configurePostgresTestEnv();
