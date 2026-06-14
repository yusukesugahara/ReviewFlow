import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../common/constants';

/**
 * route に必要なテナントロールを metadata として付与する。
 *
 * 実際の判定は `RolesGuard` が行うため、`@AuthApi()` と併用して backend 側で
 * 認可を強制する。
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
