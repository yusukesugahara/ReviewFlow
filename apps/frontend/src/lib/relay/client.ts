import "server-only";

import {
  Environment,
  Network,
  RecordSource,
  Store,
  type RequestParameters,
  type Variables,
} from "relay-runtime";
import type { GraphQLResponse } from "relay-runtime/network/RelayNetworkTypes";
import { getServerApiBaseUrl, getServerAuthEnv } from "@/lib/server/env";
import {
  isApiFailure,
  throwApiFailure,
  type ApiResponseLike,
} from "@/lib/server/api-failure";
import {
  APPLICATION_CORRECTION_TARGETS_QUERY,
  APPLICATION_DETAIL_QUERY,
} from "./application-operations";

type RequestOptions = {
  body?: unknown;
  headers?: HeadersInit;
  params?: {
    path?: Record<string, string>;
    query?: Record<string, unknown>;
  };
};

type RelayOperationKind = "query" | "mutation";

type RelayOperation = {
  field: string;
  kind: RelayOperationKind;
  name: string;
  text: string;
  variables: Record<string, unknown>;
};

type RelayClientConfig = {
  headers?: HeadersInit;
};

export function createBackendRelayEnvironment({
  headers,
}: RelayClientConfig = {}) {
  return new Environment({
    isServer: true,
    network: Network.create(async (request, variables) =>
      fetchBackendGraphql(request, variables, headers),
    ),
    store: new Store(new RecordSource()),
  });
}

export async function executeRelayOperation<TData>({
  headers,
  kind,
  name,
  text,
  variables = {},
}: {
  headers?: HeadersInit;
  kind: RelayOperationKind;
  name: string;
  text: string;
  variables?: Record<string, unknown>;
}): Promise<TData> {
  const environment = createBackendRelayEnvironment({ headers });
  const request = toRequestParameters({ kind, name, text });
  const response = await environment
    .getNetwork()
    .execute(request, variables as Variables, {})
    .toPromise();
  return unwrapGraphqlData<TData>(response);
}

export const client = {
  groups: (options?: RequestOptions) =>
    callRelayOperation(queryOperation("groups"), options),
  spaceDashboard: (options?: RequestOptions) =>
    callRelayOperation(queryOperation("spaceDashboard"), options),
  groupMembers: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("groupMembers", {
        groupId: options?.params?.path?.groupId,
      }),
      options,
    ),
  groupAvailableUsers: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("groupAvailableUsers", {
        groupId: options?.params?.path?.groupId,
      }),
      options,
    ),
  users: (options?: RequestOptions) =>
    callRelayOperation(queryOperation("users"), options),
  auditLogs: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("auditLogs", { input: options?.params?.query ?? {} }),
      options,
    ),
  formDefinitions: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("formDefinitions", {
        groupId: options?.params?.query?.groupId,
        includeArchived: options?.params?.query?.includeArchived ?? null,
      }),
      options,
    ),
  currentFormDefinitionForApplicant: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("currentFormDefinitionForApplicant"),
      options,
    ),
  currentApprovalFlowsForApplicant: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("currentApprovalFlowsForApplicant"),
      options,
    ),
  formDefinition: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("formDefinition", { id: options?.params?.path?.id }),
      options,
    ),
  returnedApplicationCorrectionTargetsForApplicant: (
    options?: RequestOptions,
  ) =>
    callRelayOperation(
      queryOperation("returnedApplicationCorrectionTargetsForApplicant"),
      options,
    ),
  application: (options?: RequestOptions) =>
    callRelayOperation(
      {
        field: "application",
        kind: "query",
        name: "ApplicationDetail",
        text: APPLICATION_DETAIL_QUERY,
        variables: { id: options?.params?.path?.id },
      },
      options,
    ).then((response) => mapSuccessData(response, toDatabaseIdApplication)),
  applicationCorrectionTargets: (options?: RequestOptions) =>
    callRelayOperation(
      {
        field: "applicationCorrectionTargets",
        kind: "query",
        name: "ApplicationCorrectionTargets",
        text: APPLICATION_CORRECTION_TARGETS_QUERY,
        variables: { id: options?.params?.path?.id },
      },
      options,
    ),
  approvalFlows: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("approvalFlows", {
        groupId: options?.params?.query?.groupId,
      }),
      options,
    ),
  exportJob: (options?: RequestOptions) =>
    callRelayOperation(
      queryOperation("exportJob", { id: options?.params?.path?.id }),
      options,
    ),
  register: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("register", { input: options?.body ?? {} }),
      options,
    ),
  login: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("login", { input: options?.body ?? {} }),
      options,
    ),
  requestPasswordReset: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("requestPasswordReset", {
        input: options?.body ?? {},
      }),
      options,
    ),
  confirmPasswordReset: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("confirmPasswordReset", {
        input: options?.body ?? {},
      }),
      options,
    ),
  me: (options?: RequestOptions) =>
    callRelayOperation(queryOperation("me"), options),
  updateMeProfile: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateMeProfile", { input: options?.body ?? {} }),
      options,
    ),
  requestMeEmailChange: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("requestMeEmailChange", {
        input: options?.body ?? {},
      }),
      options,
    ),
  confirmEmailChange: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("confirmEmailChange", {
        input: options?.body ?? {},
      }),
      options,
    ),
  updateMePassword: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateMePassword", { input: options?.body ?? {} }),
      options,
    ),
  createInvitation: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("createInvitation", { input: options?.body ?? {} }),
      options,
    ),
  acceptInvitation: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("acceptInvitation", { input: options?.body ?? {} }),
      options,
    ),
  createGroup: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("createGroup", { input: options?.body ?? {} }),
      options,
    ),
  updateGroup: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateGroup", {
        groupId: options?.params?.path?.groupId,
        input: options?.body ?? {},
      }),
      options,
    ),
  removeGroup: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("removeGroup", {
        groupId: options?.params?.path?.groupId,
      }),
      options,
    ),
  addGroupMember: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("addGroupMember", {
        groupId: options?.params?.path?.groupId,
        input: options?.body ?? {},
      }),
      options,
    ),
  updateGroupMemberRole: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateGroupMemberRole", {
        groupId: options?.params?.path?.groupId,
        userId: options?.params?.path?.userId,
        input: options?.body ?? {},
      }),
      options,
    ),
  leaveGroup: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("leaveGroup", {
        groupId: options?.params?.path?.groupId,
      }),
      options,
    ),
  removeGroupMember: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("removeGroupMember", {
        groupId: options?.params?.path?.groupId,
        userId: options?.params?.path?.userId,
      }),
      options,
    ),
  updateUserRole: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateUserRole", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  restoreUser: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("restoreUser", { id: options?.params?.path?.id }),
      options,
    ),
  removeUser: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("removeUser", { id: options?.params?.path?.id }),
      options,
    ),
  createFormDefinition: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("createFormDefinition", {
        input: options?.body ?? {},
      }),
      options,
    ),
  addFormField: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("addFormField", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  moveFormField: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("moveFormField", {
        id: options?.params?.path?.id,
        fieldId: options?.params?.path?.fieldId,
        input: options?.body ?? {},
      }),
      options,
    ),
  deleteFormField: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("deleteFormField", {
        id: options?.params?.path?.id,
        fieldId: options?.params?.path?.fieldId,
      }),
      options,
    ),
  updateFormFieldSettings: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateFormFieldSettings", {
        id: options?.params?.path?.id,
        fieldId: options?.params?.path?.fieldId,
        input: options?.body ?? {},
      }),
      options,
    ),
  publishFormDefinition: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("publishFormDefinition", {
        id: options?.params?.path?.id,
      }),
      options,
    ),
  archiveFormDefinition: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("archiveFormDefinition", {
        id: options?.params?.path?.id,
      }),
      options,
    ),
  restoreFormDefinition: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("restoreFormDefinition", {
        id: options?.params?.path?.id,
      }),
      options,
    ),
  updateFormDefinitionDescription: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateFormDefinitionDescription", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  requestFormAccess: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("requestFormAccess", {
        groupId: options?.params?.path?.groupId,
        formDefinitionId: options?.params?.query?.formDefinitionId ?? null,
        input: options?.body ?? {},
      }),
      options,
    ),
  createApprovalFlow: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("createApprovalFlow", { input: options?.body ?? {} }),
      options,
    ),
  updateApprovalFlow: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("updateApprovalFlow", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  createApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("createApplication", { input: options?.body ?? {} }),
      options,
    ),
  submitApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("submitApplication", {
        id: options?.params?.path?.id,
      }),
      options,
    ),
  approveApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("approveApplication", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  returnApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("returnApplication", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  resendReturnEmail: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("resendReturnEmail", {
        id: options?.params?.path?.id,
      }),
      options,
    ),
  rejectApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("rejectApplication", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  resubmitApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("resubmitApplication", {
        id: options?.params?.path?.id,
      }),
      options,
    ),
  patchApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("patchApplication", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  createPublicApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("createPublicApplication", {
        input: options?.body ?? {},
      }),
      options,
    ),
  patchReturnedApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("patchReturnedApplication", {
        id: options?.params?.path?.id,
        input: options?.body ?? {},
      }),
      options,
    ),
  resubmitReturnedApplication: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("resubmitReturnedApplication", {
        id: options?.params?.path?.id,
      }),
      options,
    ),
  createExportJob: (options?: RequestOptions) =>
    callRelayOperation(
      mutationOperation("createExportJob", { input: options?.body ?? {} }),
      options,
    ),
};

async function callRelayOperation(
  operation: RelayOperation,
  options: RequestOptions | undefined,
): Promise<ApiResponseLike> {
  try {
    const data = await executeRelayOperation<Record<string, unknown>>({
      headers: options?.headers,
      kind: operation.kind,
      name: operation.name,
      text: operation.text,
      variables: operation.variables,
    });
    return success(data[operation.field]);
  } catch (error) {
    if (isApiFailure(error)) {
      return {
        error: error.body,
        response: { ok: false, status: error.status },
      };
    }
    throw error;
  }
}

async function fetchBackendGraphql(
  request: RequestParameters,
  variables: Variables,
  headers: HeadersInit | undefined,
): Promise<GraphQLResponse> {
  const response = await fetch(`${getServerApiBaseUrl()}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": getServerAuthEnv().INTERNAL_API_KEY,
      ...headersToObject(headers),
    },
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throwApiFailure({
      response: { ok: false, status: response.status },
      error: body,
    });
  }

  return body as GraphQLResponse;
}

function unwrapGraphqlData<TData>(
  response: GraphQLResponse | undefined,
): TData {
  const singular = Array.isArray(response) ? response[0] : response;
  const errors = singular && "errors" in singular ? singular.errors : undefined;
  const data = singular && "data" in singular ? singular.data : undefined;

  if (errors?.length || !data) {
    throwApiFailure({
      response: {
        ok: false,
        status: statusFromGraphqlErrors(errors),
      },
      error: errors ?? singular,
    });
  }

  return data as TData;
}

function success(data: unknown): ApiResponseLike {
  return {
    data: { status: 200, data },
    response: { ok: true, status: 200 },
  };
}

function mapSuccessData(
  response: ApiResponseLike,
  mapper: (data: unknown) => unknown,
): ApiResponseLike {
  if (
    !response.response.ok ||
    !response.data ||
    typeof response.data !== "object" ||
    !("data" in response.data)
  ) {
    return response;
  }

  const envelope = response.data as { data: unknown; status?: unknown };
  return {
    ...response,
    data: {
      ...envelope,
      data: mapper(envelope.data),
    },
  };
}

function toDatabaseIdApplication(data: unknown): unknown {
  if (!data || typeof data !== "object" || !("databaseId" in data)) {
    return data;
  }

  const application = data as {
    databaseId?: unknown;
    id?: unknown;
    relayId?: unknown;
  };
  if (typeof application.databaseId !== "string") {
    return data;
  }

  return {
    ...application,
    id: application.databaseId,
    relayId: application.relayId ?? application.id,
  };
}

function queryOperation(
  field: string,
  variables: Record<string, unknown> = {},
): RelayOperation {
  const args = variableDefinitions(variables);
  return {
    field,
    kind: "query",
    name: operationName(field),
    text: `query ${operationName(field)}${args.definitions} { ${field}${args.usage} }`,
    variables,
  };
}

function mutationOperation(
  field: string,
  variables: Record<string, unknown> = {},
): RelayOperation {
  const args = variableDefinitions(variables);
  return {
    field,
    kind: "mutation",
    name: operationName(field),
    text: `mutation ${operationName(field)}${args.definitions} { ${field}${args.usage} }`,
    variables,
  };
}

function variableDefinitions(variables: Record<string, unknown>) {
  const entries = Object.entries(variables);
  if (entries.length === 0) {
    return { definitions: "", usage: "" };
  }

  return {
    definitions: `(${entries
      .map(([key, value]) => `$${key}: ${graphqlTypeForVariable(key, value)}`)
      .join(", ")})`,
    usage: `(${entries.map(([key]) => `${key}: $${key}`).join(", ")})`,
  };
}

function graphqlTypeForVariable(key: string, value: unknown): string {
  if (key === "input") {
    return "JSON!";
  }
  if (key === "includeArchived" || typeof value === "boolean") {
    return "Boolean";
  }
  if (key === "formDefinitionId" && value === null) {
    return "ID";
  }
  return "ID!";
}

function toRequestParameters({
  kind,
  name,
  text,
}: {
  kind: RelayOperationKind;
  name: string;
  text: string;
}): RequestParameters {
  return {
    cacheID: `${name}:${hashString(text)}`,
    id: null,
    metadata: {},
    name,
    operationKind: kind,
    text,
  };
}

function statusFromGraphqlErrors(
  errors: { message?: string }[] | undefined,
): number {
  const message = errors?.[0]?.message ?? "";
  if (
    message.includes("Missing X-API-Key") ||
    message.includes("bearer token")
  ) {
    return 401;
  }
  if (message.toLowerCase().includes("forbidden")) {
    return 403;
  }
  if (message.toLowerCase().includes("not found")) {
    return 404;
  }
  if (
    message.toLowerCase().includes("already") ||
    message.includes("At least one space admin must remain in the space")
  ) {
    return 409;
  }
  return 500;
}

function headersToObject(headers: HeadersInit | undefined) {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}

function operationName(field: string): string {
  return `${field.charAt(0).toUpperCase()}${field.slice(1)}`;
}

function hashString(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}
