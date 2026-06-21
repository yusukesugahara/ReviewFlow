"use client";

import {
  Environment,
  Network,
  RecordSource,
  Store,
  type RequestParameters,
  type Variables,
} from "relay-runtime";
import type { GraphQLResponse } from "relay-runtime/network/RelayNetworkTypes";

let browserRelayEnvironment: Environment | null = null;

/**
 * Browser Client Components から使う Relay Environment を返します。
 */
export function getBrowserRelayEnvironment(): Environment {
  browserRelayEnvironment ??= new Environment({
    isServer: false,
    network: Network.create(fetchBrowserGraphql),
    store: new Store(new RecordSource()),
  });

  return browserRelayEnvironment;
}

async function fetchBrowserGraphql(
  request: RequestParameters,
  variables: Variables,
): Promise<GraphQLResponse> {
  if (!request.text) {
    throw new Error(`GraphQL text is missing for ${request.name}`);
  }

  let response: Response;
  try {
    response = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: request.text,
        variables,
      }),
      credentials: "same-origin",
    });
  } catch {
    throw new GraphqlRequestError("GraphQL API is unavailable", 503);
  }
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new GraphqlRequestError(
      errorMessageFromGraphqlBody(body, response.status),
      response.status,
    );
  }

  return body as GraphQLResponse;
}

class GraphqlRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GraphqlRequestError";
  }
}

function errorMessageFromGraphqlBody(body: unknown, status: number): string {
  if (
    body &&
    typeof body === "object" &&
    "errors" in body &&
    Array.isArray(body.errors)
  ) {
    const firstError = body.errors[0];
    if (
      firstError &&
      typeof firstError === "object" &&
      "message" in firstError &&
      typeof firstError.message === "string"
    ) {
      return firstError.message;
    }
  }

  return `GraphQL request failed with status ${status}`;
}
