import type { DraftField } from "@/app/(authorized)/space/_components/application-setup-draft-form";
import type { ApprovalStepItem } from "@/app/(authorized)/space/_components/approval-steps-builder";
import { updateApplicationSetupAction } from "@/app/(authorized)/space/application-setup/actions";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import {
  APPLICATION_SETUP_ERROR_MESSAGES,
  type ApplicationSetupError,
} from "@/lib/constants/application-setup";
import { FIELD_TYPES, type FieldType } from "@/lib/constants/form-fields";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";
import { updateReturnedApplicationAction } from "./actions";
import type {
  CorrectionTargetItem,
  EditableApplicationDetail,
  EditableApprovalFlow,
  EditableFormDefinition,
  EditableFormField,
  EditableGroupMember,
  SpaceApplicationEditApiFailure,
  SpaceApplicationEditPageProps,
} from "./types";
import {
  ReturnedApplicationCorrectionView,
  SpaceApplicationEditErrorView,
  SpaceApplicationEditUnavailableView,
  SpaceApplicationEditView,
} from "./view";

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function authHeadersOrRedirect(): Promise<{ Authorization: string }> {
  const accessToken = await getAccessTokenFromCookie();
  if (!accessToken) {
    redirect("/login");
  }
  return { Authorization: `Bearer ${accessToken}` };
}

function isApiFailure(error: unknown): error is SpaceApplicationEditApiFailure {
  return !!error && typeof error === "object" && typeof (error as SpaceApplicationEditApiFailure).status === "number";
}

function asFieldType(value: string): FieldType {
  return value === FIELD_TYPES.textarea ||
    value === FIELD_TYPES.number ||
    value === FIELD_TYPES.date ||
    value === FIELD_TYPES.select ||
    value === FIELD_TYPES.radio ||
    value === FIELD_TYPES.checkbox
    ? value
    : FIELD_TYPES.text;
}

function optionsToText(options: unknown[] | null | undefined): string {
  if (!Array.isArray(options)) {
    return "";
  }
  return options
    .map((option) => {
      if (typeof option === "string") {
        return option;
      }
      if (option && typeof option === "object") {
        const raw = option as Record<string, unknown>;
        if (typeof raw.label === "string") {
          return raw.label;
        }
        if (typeof raw.value === "string") {
          return raw.value;
        }
      }
      return "";
    })
    .filter((option) => option.length > 0)
    .join("\n");
}

function toDraftFields(fields: EditableFormField[]): DraftField[] {
  return fields.map((field) => ({
    id: field.id,
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

function setupErrorMessage(error?: string): string | null {
  return error && error in APPLICATION_SETUP_ERROR_MESSAGES
    ? APPLICATION_SETUP_ERROR_MESSAGES[error as ApplicationSetupError]
    : null;
}

function setupErrorDetailMessage(detail?: string): string | null {
  return typeof detail === "string" && detail.trim().length > 0
    ? detail.trim()
    : null;
}

export default async function SpaceApplicationEditPage({
  params,
  searchParams,
}: SpaceApplicationEditPageProps) {
  const [{ spaceId, applicationId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Awaited<NonNullable<SpaceApplicationEditPageProps["searchParams"]>>),
  ]);
  try {
    const authHeaders = await authHeadersOrRedirect();
    const appRaw = await client.GET("/applications/{id}", {
      params: { path: { id: applicationId } },
      headers: authHeaders,
    });
    if (!appRaw.response.ok || !appRaw.data) {
      throw { status: appRaw.response.status };
    }
    const app = unwrapData<EditableApplicationDetail>(appRaw.data);
    const isSetupEditable =
      app.status === APPLICATION_STATUSES.draft ||
      app.status === APPLICATION_STATUSES.published;
    const isReturnedEditable = app.status === APPLICATION_STATUSES.returned;
    if (!isSetupEditable && !isReturnedEditable) {
      return <SpaceApplicationEditUnavailableView />;
    }

    const definitionId = app.formDefinitionId ?? query.definitionId;
    const templateRaw = definitionId
      ? await client.GET("/form-definitions/{id}", {
          params: { path: { id: definitionId } },
          headers: authHeaders,
        })
      : await client.GET("/form-definitions", {
          params: { query: { groupId: spaceId } },
          headers: authHeaders,
        });
    if (!templateRaw.response.ok || !templateRaw.data) {
      throw { status: templateRaw.response.status };
    }
    const definition = definitionId
      ? unwrapData<EditableFormDefinition>(templateRaw.data)
      : (unwrapData<{ definitions?: EditableFormDefinition[] }>(templateRaw.data)
          .definitions?.[0] ?? null);
    const fields = definition?.fields ?? [];
    const detailPath = `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}${
      definitionId ? `?definitionId=${encodeURIComponent(definitionId)}` : ""
    }`;
    const editPath = `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}/edit${
      definitionId ? `?definitionId=${encodeURIComponent(definitionId)}` : ""
    }`;

    if (isReturnedEditable) {
      const correctionTargetsRaw = await client.GET("/applications/{id}/correction-targets", {
        params: { path: { id: applicationId } },
        headers: authHeaders,
      });
      if (!correctionTargetsRaw.response.ok || !correctionTargetsRaw.data) {
        throw { status: correctionTargetsRaw.response.status };
      }
      const targets =
        unwrapData<{
          openCorrection?: {
            overallComment?: string | null;
            items?: CorrectionTargetItem[];
          } | null;
        }>(correctionTargetsRaw.data).openCorrection ?? null;

      return (
        <ReturnedApplicationCorrectionView
          action={updateReturnedApplicationAction.bind(
            null,
            spaceId,
            applicationId,
            detailPath,
            editPath,
          )}
          correctionError={query.correctionError}
          detailPath={detailPath}
          fields={fields}
          overallComment={targets?.overallComment}
          targets={targets?.items ?? []}
        />
      );
    }

    const [membersRaw, flowsRaw] = await Promise.all([
      client.GET("/groups/{groupId}/members", {
        params: { path: { groupId: spaceId } },
        headers: authHeaders,
      }),
      client.GET("/approval-flows", {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      }),
    ]);
    if (!membersRaw.response.ok || !membersRaw.data) {
      throw { status: membersRaw.response.status };
    }
    if (!flowsRaw.response.ok || !flowsRaw.data) {
      throw { status: flowsRaw.response.status };
    }
    const members =
      unwrapData<{ members?: EditableGroupMember[] }>(membersRaw.data).members ?? [];
    const assignees = members.map((member) => ({
      id: member.userId,
      label: member.name ? `${member.name} (${member.email})` : member.email,
    }));
    const flows = unwrapData<{ flows?: EditableApprovalFlow[] }>(flowsRaw.data).flows ?? [];
    const currentFlow =
      flows.find((flow) => flow.id === app.approvalFlowId) ?? null;
    return (
      <SpaceApplicationEditView
        action={updateApplicationSetupAction.bind(null, applicationId)}
        assignees={assignees}
        detailPath={detailPath}
        errorMessage={
          [
            setupErrorMessage(query.setupError),
            setupErrorDetailMessage(query.setupErrorDetail),
          ]
            .filter(Boolean)
            .join(" ")
        }
        initialFields={toDraftFields(fields)}
        initialName={definition?.name}
        initialSteps={toInitialSteps(currentFlow)}
        returnPath={editPath}
        spaceId={spaceId}
      />
    );
  } catch (error) {
    if (isApiFailure(error)) {
      return <SpaceApplicationEditErrorView status={error.status} />;
    }
    return <SpaceApplicationEditErrorView />;
  }
}
