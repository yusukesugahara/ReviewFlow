import { BadRequestException } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';

const CURSOR_PREFIX = 'arrayconnection';
const CURSOR_SEPARATOR = ':';

@ObjectType('PageInfo')
export class PageInfoGql {
  @Field()
  hasNextPage!: boolean;

  @Field()
  hasPreviousPage!: boolean;

  @Field(() => String, { nullable: true })
  startCursor!: string | null;

  @Field(() => String, { nullable: true })
  endCursor!: string | null;
}

export type OffsetPage<TNode> = {
  nodes: TNode[];
  startOffset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type RelayEdgeResult<TNode> = {
  cursor: string;
  node: TNode;
};

export type RelayConnectionResult<TNode> = {
  edges: RelayEdgeResult<TNode>[];
  nodes: TNode[];
  pageInfo: PageInfoGql;
  totalCount: number;
};

export type RelayOffsetPaginationArgs = {
  after?: string | null;
  first: number;
  maxFirst?: number;
};

export type RelayOffsetPagination = {
  limit: number;
  offset: number;
};

export function toOffsetCursor(offset: number): string {
  return Buffer.from(
    `${CURSOR_PREFIX}${CURSOR_SEPARATOR}${offset}`,
    'utf8',
  ).toString('base64url');
}

export function fromOffsetCursor(cursor: string): number {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new BadRequestException('Invalid Relay cursor.');
  }

  const [prefix, offsetText] = decoded.split(CURSOR_SEPARATOR);
  const offset = Number(offsetText);
  if (prefix !== CURSOR_PREFIX || !Number.isInteger(offset) || offset < 0) {
    throw new BadRequestException('Invalid Relay cursor.');
  }

  return offset;
}

export function paginateByOffset<TNode>({
  after,
  first,
  maxFirst = 100,
  nodes,
}: {
  after?: string | null;
  first: number;
  maxFirst?: number;
  nodes: TNode[];
}): OffsetPage<TNode> {
  if (!Number.isInteger(first) || first < 0 || first > maxFirst) {
    throw new BadRequestException(`first must be between 0 and ${maxFirst}.`);
  }

  const startOffset = after ? fromOffsetCursor(after) + 1 : 0;
  const pageNodes = nodes.slice(startOffset, startOffset + first);

  return {
    nodes: pageNodes,
    startOffset,
    hasNextPage: startOffset + pageNodes.length < nodes.length,
    hasPreviousPage: startOffset > 0,
  };
}

export function resolveOffsetPagination({
  after,
  first,
  maxFirst = 100,
}: RelayOffsetPaginationArgs): RelayOffsetPagination {
  if (!Number.isInteger(first) || first < 0 || first > maxFirst) {
    throw new BadRequestException(`first must be between 0 and ${maxFirst}.`);
  }

  return {
    limit: first,
    offset: after ? fromOffsetCursor(after) + 1 : 0,
  };
}

export function connectionFromNodes<TNode>({
  after,
  first,
  maxFirst,
  nodes,
}: {
  after?: string | null;
  first: number;
  maxFirst?: number;
  nodes: TNode[];
}): RelayConnectionResult<TNode> {
  const page = paginateByOffset({
    after,
    first,
    maxFirst,
    nodes,
  });
  const edges = page.nodes.map((node, index) => ({
    node,
    cursor: toOffsetCursor(page.startOffset + index),
  }));

  return {
    edges,
    nodes: page.nodes,
    pageInfo: {
      hasNextPage: page.hasNextPage,
      hasPreviousPage: page.hasPreviousPage,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount: nodes.length,
  };
}

export function connectionFromOffsetPage<TNode>({
  nodes,
  offset,
  totalCount,
}: {
  nodes: TNode[];
  offset: number;
  totalCount: number;
}): RelayConnectionResult<TNode> {
  const edges = nodes.map((node, index) => ({
    node,
    cursor: toOffsetCursor(offset + index),
  }));

  return {
    edges,
    nodes,
    pageInfo: {
      hasNextPage: offset + nodes.length < totalCount,
      hasPreviousPage: offset > 0,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount,
  };
}
