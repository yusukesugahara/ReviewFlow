import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../common/constants';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
