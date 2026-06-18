import {
  APPROVAL_FLOW_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from '../../../../common/graphql/relay-id';
import type { ApprovalFlowResponseDto } from '../dto/approval-flows.dto';
import type { ApprovalFlowGql } from './approval-flows.graphql.types';

export function toApprovalFlowGql(
  flow: ApprovalFlowResponseDto,
): ApprovalFlowGql {
  return {
    __typename: 'ApprovalFlow',
    ...flow,
    id: toRelayGlobalId(APPROVAL_FLOW_RELAY_NODE_TYPE, flow.id),
    databaseId: flow.id,
  };
}
