import "server-only";

import { client } from "@/lib/server/backend-fetch";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { throwIfApiResponseFailed } from "@/lib/server/api-failure";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import {
  toApprovalStepRequest,
  toFieldPayloads,
  toFieldRequest,
} from "./application-setup-payload";
import type { ApplicationSetupActionInput } from "./application-setup-action-input";

type CreateDefinitionResponse = {
  id: string;
};

type CreateApprovalFlowResponse = {
  id: string;
};

type CreateApplicationResponse = {
  id: string;
};

export type CreatedApplicationSetup = {
  applicationId: string;
  definitionId: string;
};

export type UpdateApplicationSetupInput = ApplicationSetupActionInput & {
  currentApprovalFlowId: string;
  currentFormDefinitionId: string;
};

export async function createApplicationSetup(
  input: ApplicationSetupActionInput,
): Promise<CreatedApplicationSetup> {
  const authHeaders = await authHeadersOrRedirect();
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

  const flowResponse = await client.POST("/approval-flows", {
    body: {
      groupId: input.spaceId,
      name: `${name} 承認フロー`,
      steps: toApprovalStepRequest(input.steps),
    },
    headers: authHeaders,
  });
  const flow = unwrapResponseData<CreateApprovalFlowResponse>(flowResponse);

  const applicationResponse = await client.POST("/applications", {
    body: {
      groupId: input.spaceId,
      formDefinitionId: created.id,
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
    definitionId: created.id,
  };
}

export async function updateApplicationSetup(
  applicationId: string,
  input: UpdateApplicationSetupInput,
): Promise<void> {
  const authHeaders = await authHeadersOrRedirect();
  const name = input.name.trim();

  const flowResponse = await client.PATCH("/approval-flows/{id}", {
    params: { path: { id: input.currentApprovalFlowId } },
    body: {
      name: `${name} 承認フロー`,
      steps: toApprovalStepRequest(input.steps),
    },
    headers: authHeaders,
  });
  throwIfApiResponseFailed(flowResponse);

  const applicationResponse = await client.PATCH("/applications/{id}", {
    params: { path: { id: applicationId } },
    body: {
      status: input.applicationStatus,
    },
    headers: authHeaders,
  });
  throwIfApiResponseFailed(applicationResponse);
}
