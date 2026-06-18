import {
  toRelayGlobalId,
  USER_RELAY_NODE_TYPE,
} from '../../../../common/graphql/relay-id';
import type { User } from '../../../../models/entities/user.entity';
import type { UserGql } from './users.graphql.types';

export function toUserGql(user: User): UserGql {
  return {
    __typename: 'User',
    id: toRelayGlobalId(USER_RELAY_NODE_TYPE, user.id),
    databaseId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}
