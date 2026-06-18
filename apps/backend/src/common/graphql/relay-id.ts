import { BadRequestException } from '@nestjs/common';

export const RELAY_NODE_TYPES = {
  APPLICATION: 'Application',
  APPROVAL_FLOW: 'ApprovalFlow',
  AUDIT_LOG: 'AuditLog',
  EXPORT_JOB: 'ExportJob',
  FORM_DEFINITION: 'FormDefinition',
  GROUP: 'Group',
  USER: 'User',
} as const;

export const APPLICATION_RELAY_NODE_TYPE = RELAY_NODE_TYPES.APPLICATION;
export const APPROVAL_FLOW_RELAY_NODE_TYPE = RELAY_NODE_TYPES.APPROVAL_FLOW;
export const AUDIT_LOG_RELAY_NODE_TYPE = RELAY_NODE_TYPES.AUDIT_LOG;
export const EXPORT_JOB_RELAY_NODE_TYPE = RELAY_NODE_TYPES.EXPORT_JOB;
export const FORM_DEFINITION_RELAY_NODE_TYPE = RELAY_NODE_TYPES.FORM_DEFINITION;
export const GROUP_RELAY_NODE_TYPE = RELAY_NODE_TYPES.GROUP;
export const USER_RELAY_NODE_TYPE = RELAY_NODE_TYPES.USER;

const GLOBAL_ID_SEPARATOR = ':';

export type RelayNodeType =
  (typeof RELAY_NODE_TYPES)[keyof typeof RELAY_NODE_TYPES];

export type DecodedRelayGlobalId = {
  type: RelayNodeType;
  id: string;
};

const SUPPORTED_RELAY_NODE_TYPES = new Set<RelayNodeType>(
  Object.values(RELAY_NODE_TYPES) as RelayNodeType[],
);

export function toRelayGlobalId(type: RelayNodeType, id: string): string {
  return Buffer.from(`${type}${GLOBAL_ID_SEPARATOR}${id}`, 'utf8').toString(
    'base64url',
  );
}

export function fromRelayGlobalId(globalId: string): DecodedRelayGlobalId {
  let decoded: string;
  try {
    decoded = Buffer.from(globalId, 'base64url').toString('utf8');
  } catch {
    throw new BadRequestException('Invalid Relay global ID.');
  }

  const separatorIndex = decoded.indexOf(GLOBAL_ID_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === decoded.length - 1) {
    throw new BadRequestException('Invalid Relay global ID.');
  }

  const type = decoded.slice(0, separatorIndex);
  const id = decoded.slice(separatorIndex + 1);
  if (!isRelayNodeType(type)) {
    throw new BadRequestException('Unsupported Relay node type.');
  }

  return { type, id };
}

function isRelayNodeType(value: string): value is RelayNodeType {
  return SUPPORTED_RELAY_NODE_TYPES.has(value as RelayNodeType);
}
