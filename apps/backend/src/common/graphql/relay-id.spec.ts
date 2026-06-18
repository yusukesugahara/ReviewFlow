import { BadRequestException } from '@nestjs/common';
import {
  APPLICATION_RELAY_NODE_TYPE,
  fromRelayGlobalId,
  GROUP_RELAY_NODE_TYPE,
  toRelayGlobalId,
} from './relay-id';

describe('Relay global ID helpers', () => {
  it('round-trips a supported node type and database ID', () => {
    const globalId = toRelayGlobalId(
      APPLICATION_RELAY_NODE_TYPE,
      '00000000-0000-4000-8000-000000000001',
    );

    expect(fromRelayGlobalId(globalId)).toEqual({
      type: APPLICATION_RELAY_NODE_TYPE,
      id: '00000000-0000-4000-8000-000000000001',
    });
  });

  it('supports non-application Relay node types', () => {
    const globalId = toRelayGlobalId(
      GROUP_RELAY_NODE_TYPE,
      '00000000-0000-4000-8000-000000000002',
    );

    expect(fromRelayGlobalId(globalId)).toEqual({
      type: GROUP_RELAY_NODE_TYPE,
      id: '00000000-0000-4000-8000-000000000002',
    });
  });

  it('rejects unsupported node types', () => {
    const globalId = Buffer.from(
      'Unsupported:00000000-0000-4000-8000-000000000003',
      'utf8',
    ).toString('base64url');

    expect(() => fromRelayGlobalId(globalId)).toThrow(BadRequestException);
  });
});
