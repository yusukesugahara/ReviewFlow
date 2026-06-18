import {
  GROUP_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from '../../../../common/graphql/relay-id';
import type { GroupMemberRoleValue } from '../../../../models/constants/group-member-role';
import type { Group } from '../../../../models/entities/group.entity';
import type { GroupGql } from './groups.graphql.types';

type GroupWithCurrentUserRole = Group & {
  currentUserRole?: GroupMemberRoleValue | null;
};

export function toGroupGql(group: GroupWithCurrentUserRole): GroupGql {
  return {
    __typename: 'Group',
    id: toRelayGlobalId(GROUP_RELAY_NODE_TYPE, group.id),
    databaseId: group.id,
    name: group.name,
    description: group.description,
    createdByUserId: group.createdByUserId,
    currentUserRole: group.currentUserRole ?? null,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}
