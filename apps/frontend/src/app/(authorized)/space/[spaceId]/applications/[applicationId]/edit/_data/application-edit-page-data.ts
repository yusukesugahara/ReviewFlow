import "server-only";

import type { DraftField } from "@/components/application-setup/form-builder/application-setup-draft-form";
import type { ApprovalStepItem } from "@/components/application-setup/approval-flow/approval-steps-builder";
import {
  buildSpaceApplicationDetailHrefByIds,
  buildSpaceApplicationEditHrefByIds,
} from "@/components/applications/routing/application-routes";
import { normalizeFieldOptions } from "@/components/applications/dynamic-fields/field-options";
import {
  isFormSetupStatus,
  isPublishedApplicationStatus,
  isReturnedApplicationStatus,
} from "@/components/applications/status/application-status-rules";
import { FIELD_TYPES, isFieldType, type FieldType } from "@/lib/constants/form-fields";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/server/backend-fetch";
import type {
  CorrectionTargetItem,
  EditableApplicationDetail,
  EditableApprovalFlow,
  EditableFormDefinition,
  EditableFormField,
  EditableGroupMember,
} from "../types";

type AuthHeaders = { Authorization: string };

type EditPageBaseData = {
  detailPath: string;
  editPath: string;
};

export type ReturnedApplicationEditPageData = EditPageBaseData & {
  kind: "returned";
  fields: EditableFormField[];
  overallComment?: string | null;
  targets: CorrectionTargetItem[];
};

export type SetupApplicationEditPageData = EditPageBaseData & {
  kind: "setup";
  assignees: Array<{ id: string; label: string }>;
  currentApprovalFlowId?: string | null;
  currentFormDefinitionId?: string | null;
  initialFields: DraftField[];
  initialName?: string;
  initialSteps: ApprovalStepItem[];
  publishedFormDefinitionId?: string;
};

export type SpaceApplicationEditPageData =
  | { kind: "unavailable" }
  | ReturnedApplicationEditPageData
  | SetupApplicationEditPageData;

export async function getSpaceApplicationEditPageData({
  applicationId,
  queryDefinitionId,
  spaceId,
}: {
  applicationId: string;
  queryDefinitionId?: string;
  spaceId: string;
}): Promise<SpaceApplicationEditPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const appRaw = await client.GET("/applications/{id}", {
    params: { path: { id: applicationId } },
    headers: authHeaders,
  });
  const app = unwrapResponseData<EditableApplicationDetail>(appRaw);

  const isSetupEditable = isFormSetupStatus(app.status);
  const isReturnedEditable = isReturnedApplicationStatus(app.status);
  if (!isSetupEditable && !isReturnedEditable) {
    return { kind: "unavailable" };
  }

  const definitionId = app.formDefinitionId ?? queryDefinitionId;
  const definition = await getFormDefinition({
    authHeaders,
    definitionId,
    spaceId,
  });
  const fields = definition?.fields ?? [];
  const detailPath = buildSpaceApplicationDetailHrefByIds(
    spaceId,
    applicationId,
    definitionId,
  );
  const editPath = buildSpaceApplicationEditHrefByIds(
    spaceId,
    applicationId,
    definitionId,
  );

  if (isReturnedEditable) {
    const openCorrection = await getOpenCorrection({
      applicationId,
      authHeaders,
    });

    return {
      kind: "returned",
      detailPath,
      editPath,
      fields,
      overallComment: openCorrection?.overallComment,
      targets: openCorrection?.items ?? [],
    };
  }

  const [members, flows] = await Promise.all([
    getSpaceMembers({ authHeaders, spaceId }),
    getApprovalFlows({ authHeaders, spaceId }),
  ]);
  const currentFlow = flows.find((flow) => flow.id === app.approvalFlowId) ?? null;

  return {
    kind: "setup",
    assignees: members.map((member) => ({
      id: member.userId,
      label: member.name ? `${member.name} (${member.email})` : member.email,
    })),
    currentApprovalFlowId: app.approvalFlowId,
    currentFormDefinitionId: definitionId,
    detailPath,
    editPath,
    initialFields: toDraftFields(fields),
    initialName: definition?.name,
    initialSteps: toInitialSteps(currentFlow),
    publishedFormDefinitionId: isPublishedApplicationStatus(app.status)
      ? definitionId
      : undefined,
  };
}

async function getFormDefinition({
  authHeaders,
  definitionId,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  definitionId?: string;
  spaceId: string;
}): Promise<EditableFormDefinition | null> {
  const definitionRaw = definitionId
    ? await client.GET("/form-definitions/{id}", {
        params: { path: { id: definitionId } },
        headers: authHeaders,
      })
    : await client.GET("/form-definitions", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      });

  return definitionId
    ? unwrapResponseData<EditableFormDefinition>(definitionRaw)
    : (unwrapResponseData<{ definitions?: EditableFormDefinition[] }>(
        definitionRaw,
      ).definitions?.[0] ?? null);
}

async function getOpenCorrection({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<{
  overallComment?: string | null;
  items?: CorrectionTargetItem[];
} | null> {
  const correctionTargetsRaw = await client.GET(
    "/applications/{id}/correction-targets",
    {
      params: { path: { id: applicationId } },
      headers: authHeaders,
    },
  );

  return (
    unwrapResponseData<{
      openCorrection?: {
        overallComment?: string | null;
        items?: CorrectionTargetItem[];
      } | null;
    }>(correctionTargetsRaw).openCorrection ?? null
  );
}

async function getSpaceMembers({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<EditableGroupMember[]> {
  const membersRaw = await client.GET("/groups/{groupId}/members", {
    params: { path: { groupId: spaceId } },
    headers: authHeaders,
  });

  return unwrapResponseData<{ members?: EditableGroupMember[] }>(membersRaw)
    .members ?? [];
}

async function getApprovalFlows({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<EditableApprovalFlow[]> {
  const flowsRaw = await client.GET("/approval-flows", {
    params: { query: { groupId: spaceId } },
    headers: authHeaders,
  });

  return unwrapResponseData<{ flows?: EditableApprovalFlow[] }>(flowsRaw).flows ?? [];
}

function asFieldType(value: string): FieldType {
  return isFieldType(value) ? value : FIELD_TYPES.text;
}

function optionsToText(options: unknown[] | null | undefined): string {
  return normalizeFieldOptions(options)
    .map((option) => option.label || option.value)
    .filter((option) => option.length > 0)
    .join("\n");
}

function toDraftFields(fields: EditableFormField[]): DraftField[] {
  return fields.map((field) => ({
    id: field.id,
    fieldKey: field.fieldKey,
    label: field.label,
    fieldType: asFieldType(field.fieldType),
    required: field.required,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    optionsText: optionsToText(field.options),
  }));
}

function toInitialSteps(flow: EditableApprovalFlow | null): ApprovalStepItem[] {
  return (flow?.steps ?? []).map((step) => ({
    id: step.id,
    stepName: step.stepName,
    assigneeUserIds:
      step.assigneeUserIds && step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : step.assigneeUserId
          ? [step.assigneeUserId]
          : [],
    canReturn: step.canReturn,
  }));
}
