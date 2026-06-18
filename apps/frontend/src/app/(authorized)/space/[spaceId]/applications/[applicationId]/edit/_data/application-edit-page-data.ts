import "server-only";

import type { DraftField } from "@/components/application-setup/form-builder/application-setup-draft-form";
import type { ApprovalStepItem } from "@/components/application-setup/approval-flow/approval-steps-builder";
import {
  buildSpaceApplicationDetailHrefByIds,
  buildSpaceApplicationEditHrefByIds,
} from "@/components/applications/routing/application-routes";
import {
  isFormSetupStatus,
  isPublishedApplicationStatus,
  isReturnedApplicationStatus,
} from "@/components/applications/status/application-status-rules";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/relay/client";
import {
  toApprovalAssigneeOptions,
  toDraftFields,
  toInitialSteps,
} from "../_view-models/setup-application-edit-view-model";
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

/**
 * セットアップ申請または差戻し申請の編集画面データを読み込みます。
 */
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
  const appRaw = await client.application( {
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
    assignees: toApprovalAssigneeOptions(members),
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

/**
 * 編集対象のフォーム定義を取得し、指定がない場合はスペース内の先頭定義を使います。
 */
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
    ? await client.formDefinition( {
        params: { path: { id: definitionId } },
        headers: authHeaders,
      })
    : await client.formDefinitions( {
        params: { query: { groupId: spaceId } },
        headers: authHeaders,
      });

  return definitionId
    ? unwrapResponseData<EditableFormDefinition>(definitionRaw)
    : (unwrapResponseData<{ definitions?: EditableFormDefinition[] }>(
        definitionRaw,
      ).definitions?.[0] ?? null);
}

/**
 * 差戻し申請に紐づく未完了の修正依頼を取得します。
 */
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
  const correctionTargetsRaw = await client.applicationCorrectionTargets(
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

/**
 * 承認担当者として選択できるメンバーを取得します。
 */
async function getSpaceMembers({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<EditableGroupMember[]> {
  const membersRaw = await client.groupMembers( {
    params: { path: { groupId: spaceId } },
    headers: authHeaders,
  });

  return unwrapResponseData<{ members?: EditableGroupMember[] }>(membersRaw)
    .members ?? [];
}

/**
 * 現在のスペースに属する承認フローを取得します。
 */
async function getApprovalFlows({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<EditableApprovalFlow[]> {
  const flowsRaw = await client.approvalFlows( {
    params: { query: { groupId: spaceId } },
    headers: authHeaders,
  });

  return unwrapResponseData<{ flows?: EditableApprovalFlow[] }>(flowsRaw).flows ?? [];
}
