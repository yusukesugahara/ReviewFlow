import "server-only";

import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { throwIfApiResponseFailed } from "@/lib/server/api-failure";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import {
  toApprovalStepRequest,
  toFieldPayloads,
  toFieldRequest,
} from "../_utils/application-setup-payload";
import type { ApplicationSetupActionInput } from "../_utils/application-setup-action-input";

type CreateDefinitionResponse = {
  id: string;
};

type CreateApprovalFlowResponse = {
  id: string;
};

type CreateApplicationResponse = {
  id: string;
};

export type ApplicationSetupSaveResult = {
  applicationId: string;
  definitionId: string;
};

type AuthHeaders = { Authorization: string };

export async function createApplicationSetup(
  input: ApplicationSetupActionInput,
): Promise<ApplicationSetupSaveResult> {
  const authHeaders = await authHeadersOrRedirect();
  const definition = await createPublishedFormDefinition(input, authHeaders);
  const flow = await createApprovalFlow(input, authHeaders);

  const applicationResponse = await client.POST("/applications", {
    body: {
      groupId: input.spaceId,
      formDefinitionId: definition.id,
      approvalFlowId: flow.id,
      status: input.applicationStatus,
      values: {},
    },
    headers: authHeaders,
  });
  const application =
    unwrapResponseData<CreateApplicationResponse>(applicationResponse);

  return {
    applicationId: application.id,
    definitionId: definition.id,
  };
}

export async function updateApplicationSetup(
  applicationId: string,
  input: ApplicationSetupActionInput,
): Promise<ApplicationSetupSaveResult> {
  const authHeaders = await authHeadersOrRedirect();
  const definition = await createPublishedFormDefinition(input, authHeaders);
  const flow = await createApprovalFlow(input, authHeaders);

  const applicationResponse = await client.PATCH("/applications/{id}", {
    params: { path: { id: applicationId } },
    body: {
      formDefinitionId: definition.id,
      approvalFlowId: flow.id,
      status: input.applicationStatus,
      values: {},
    },
    headers: authHeaders,
  });
  throwIfApiResponseFailed(applicationResponse);

  return {
    applicationId,
    definitionId: definition.id,
  };
}

async function createPublishedFormDefinition(
  input: ApplicationSetupActionInput,
  authHeaders: AuthHeaders,
): Promise<CreateDefinitionResponse> {
  const name = input.name.trim();
  const fieldPayloads = toFieldPayloads(input.fields);
  const createdResponse = await client.POST("/form-definitions", {
    body: {
      groupId: input.spaceId,
      name,
      description: `${name} の申請`,
    },
    headers: authHeaders,
  });
  const created = unwrapResponseData<CreateDefinitionResponse>(createdResponse);

  for (const field of fieldPayloads) {
    const fieldResponse = await client.POST("/form-definitions/{id}/fields", {
      params: { path: { id: created.id } },
      body: toFieldRequest(field),
      headers: authHeaders,
    });
    throwIfApiResponseFailed(fieldResponse);
  }

  const publishResponse = await client.POST("/form-definitions/{id}/publish", {
    params: { path: { id: created.id } },
    headers: authHeaders,
  });
  throwIfApiResponseFailed(publishResponse);

  return created;
}

async function createApprovalFlow(
  input: ApplicationSetupActionInput,
  authHeaders: AuthHeaders,
): Promise<CreateApprovalFlowResponse> {
  const name = input.name.trim();
  const flowResponse = await client.POST("/approval-flows", {
    body: {
      groupId: input.spaceId,
      name: `${name} 承認フロー`,
      steps: toApprovalStepRequest(input.steps),
    },
    headers: authHeaders,
  });
  const flow = unwrapResponseData<CreateApprovalFlowResponse>(flowResponse);
  return flow;
}
