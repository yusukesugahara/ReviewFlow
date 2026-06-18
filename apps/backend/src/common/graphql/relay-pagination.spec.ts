import { BadRequestException } from '@nestjs/common';
import {
  connectionFromNodes,
  fromOffsetCursor,
  toOffsetCursor,
} from './relay-pagination';

describe('Relay pagination helpers', () => {
  it('round-trips offset cursors', () => {
    const cursor = toOffsetCursor(12);

    expect(fromOffsetCursor(cursor)).toBe(12);
  });

  it('creates a connection from an in-memory node list', () => {
    const connection = connectionFromNodes({
      first: 2,
      nodes: ['a', 'b', 'c'],
    });

    expect(connection.nodes).toEqual(['a', 'b']);
    expect(connection.edges).toEqual([
      { node: 'a', cursor: toOffsetCursor(0) },
      { node: 'b', cursor: toOffsetCursor(1) },
    ]);
    expect(connection.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: toOffsetCursor(0),
      endCursor: toOffsetCursor(1),
    });
    expect(connection.totalCount).toBe(3);
  });

  it('allows first zero as an empty forward slice', () => {
    const connection = connectionFromNodes({
      first: 0,
      nodes: ['a', 'b'],
    });

    expect(connection.nodes).toEqual([]);
    expect(connection.edges).toEqual([]);
    expect(connection.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    });
    expect(connection.totalCount).toBe(2);
  });

  it('rejects invalid page sizes', () => {
    expect(() => connectionFromNodes({ first: -1, nodes: [] })).toThrow(
      BadRequestException,
    );
  });
});
