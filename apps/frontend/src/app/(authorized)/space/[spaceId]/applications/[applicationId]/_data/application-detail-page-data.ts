import "server-only";

import { getApplicationCapabilities } from "@/components/applications/actions/application-capabilities";
import type { ApplicationCapabilities } from "@/components/applications/actions/application-capabilities";
import {
  buildApplyFormHref,
  buildSpaceApplicationEditHrefByIds,
  buildSpaceApplicationFormDetailHref,
} from "@/components/applications/routing/application-routes";
import type {
  ApplicationCorrection,
  ApplicationCorrectionTargetItem,
  ApplicationDetailViewModel,
  ApplicationFormField,
} from "@/components/applications/detail/application-detail.types";
import { getLatestCorrectionCycleFieldKeys } from "@/components/applications/detail/application-corrected-field-keys";
import { isFormSetupStatus } from "@/components/applications/status/application-status-rules";
import { authHeadersOrRedirect } from "@/lib/server/action-auth";
import { unwrapResponseData } from "@/lib/server/api-envelope";
import { client } from "@/lib/relay/client";
import type { AuditLogsListSuccessJson } from "@/lib/schema";
import {
  getMissingRequiredFields,
  isRelatedSubmittedApplication,
  isSetupApplicationForDefinition,
} from "../_rules/application-detail-rules";
import type { ApplicationSummary, FormDefinitionDetail } from "../types";
import {
  getRelayApplication,
  getRelayApplicationCorrections,
  getRelayApplications,
  getRelayOpenCorrectionItems,
} from "@/lib/relay/applications";
import { isApiFailure } from "@/lib/server/api-failure";

type AuthHeaders = { Authorization: string };

type ApplicationDetailBaseData = {
  application: ApplicationDetailViewModel;
  definitionId?: string;
  fields: ApplicationFormField[];
};

export type FormDetailPageData = ApplicationDetailBaseData & {
  kind: "form";
  definition: FormDefinitionDetail | null;
  editHref: string;
  publicApplicationUrlPath: string;
  relatedApplications: ApplicationSummary[];
};

export type ApplicationDetailPageData = ApplicationDetailBaseData & {
  kind: "application";
  capabilities: ApplicationCapabilities;
  corrections: ApplicationCorrection[];
  correctedFieldKeys: string[];
  fieldMap: Array<{ id: string; key: string }>;
  formDetailHref: string | null;
  missingRequiredFields: ApplicationFormField[];
  openItems: ApplicationCorrectionTargetItem[];
};

export type SpaceApplicationDetailPageData =
  | FormDetailPageData
  | ApplicationDetailPageData;

/**
 * セットアップフォームまたは提出済み申請の詳細画面データを読み込みます。
 */
export async function getSpaceApplicationDetailPageData({
  applicationId,
  queryDefinitionId,
  spaceId,
}: {
  applicationId: string;
  queryDefinitionId?: string;
  spaceId: string;
}): Promise<SpaceApplicationDetailPageData> {
  const authHeaders = await authHeadersOrRedirect();
  const application = await getRelayApplication({
    applicationId,
    authHeaders,
  });
  const definitionId = application.formDefinitionId ?? queryDefinitionId;

  const [definition, corrections, openItems, correctedFieldKeys] = await Promise.all([
    getFormDefinition({ authHeaders, definitionId, spaceId }),
    getApplicationCorrections({ applicationId, authHeaders }),
    getOpenCorrectionItems({ applicationId, authHeaders }),
    getCorrectedFieldKeys({ applicationId, authHeaders }),
  ]);
  const fields = definition?.fields ?? [];

  if (isFormSetupStatus(application.status)) {
    const relatedApplications = await getRelatedSubmittedApplications({
      authHeaders,
      definitionId,
      spaceId,
    });
    return {
      kind: "form",
      application,
      definition,
      definitionId,
      editHref: buildSpaceApplicationEditHrefByIds(
        spaceId,
        application.id,
        definitionId,
      ),
      fields,
      publicApplicationUrlPath: buildApplyFormHref(spaceId, definitionId),
      relatedApplications,
    };
  }

  return {
    kind: "application",
    application,
    capabilities: getApplicationCapabilities(application),
    corrections,
    correctedFieldKeys,
    definitionId,
    fieldMap: fields.map((field) => ({ id: field.id, key: field.fieldKey })),
    fields,
    formDetailHref: await getFormDetailHref({
      authHeaders,
      definitionId,
      spaceId,
    }),
    missingRequiredFields: getMissingRequiredFields(fields, application.values),
    openItems,
  };
}

/**
 * 最新の差戻し修正で保存された fieldKey を監査ログから取得します。
 */
async function getCorrectedFieldKeys({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<string[]> {
  try {
    const logsRaw = await client.auditLogs( {
      params: {
        query: {
          actionType: "application.",
          applicationId,
          limit: 200,
        },
      },
      headers: authHeaders,
    });
    const logs = unwrapResponseData<AuditLogsListSuccessJson["data"]>(
      logsRaw,
    ).logs;
    return getLatestCorrectionCycleFieldKeys(logs);
  } catch (error) {
    if (isApiFailure(error)) {
      return [];
    }
    throw error;
  }
}

/**
 * 対象フォーム定義を取得し、指定がない場合はスペース内の先頭定義を使います。
 */
async function getFormDefinition({
  authHeaders,
  definitionId,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  definitionId?: string;
  spaceId: string;
}): Promise<FormDefinitionDetail | null> {
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
    ? unwrapResponseData<FormDefinitionDetail>(definitionRaw)
    : (unwrapResponseData<{
        definitions?: FormDefinitionDetail[];
      }>(definitionRaw).definitions?.[0] ?? null);
}

/**
 * 選択中の申請に紐づく差戻し履歴を取得します。
 */
async function getApplicationCorrections({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<ApplicationCorrection[]> {
  return getRelayApplicationCorrections({ applicationId, authHeaders });
}

/**
 * 差戻し中の申請で修正対象になっている項目を取得します。
 */
async function getOpenCorrectionItems({
  applicationId,
  authHeaders,
}: {
  applicationId: string;
  authHeaders: AuthHeaders;
}): Promise<ApplicationCorrectionTargetItem[]> {
  return getRelayOpenCorrectionItems({ applicationId, authHeaders });
}

/**
 * 同じフォーム定義から作成された提出済み申請を取得します。
 */
async function getRelatedSubmittedApplications({
  authHeaders,
  definitionId,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  definitionId?: string;
  spaceId: string;
}): Promise<ApplicationSummary[]> {
  const applications = await getSpaceApplications({ authHeaders, spaceId });
  return applications.filter((row) =>
    isRelatedSubmittedApplication(row, definitionId),
  );
}

/**
 * 申請のフォーム定義に対応するセットアップフォーム詳細 URL を解決します。
 */
async function getFormDetailHref({
  authHeaders,
  definitionId,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  definitionId?: string;
  spaceId: string;
}): Promise<string | null> {
  if (!definitionId) {
    return null;
  }

  const applications = await getSpaceApplicationsIfAvailable({
    authHeaders,
    spaceId,
  });
  const setupApplication =
    applications.find((row) =>
      isSetupApplicationForDefinition(row, definitionId),
    ) ?? null;

  return setupApplication
    ? buildSpaceApplicationFormDetailHref({
        applicationId: setupApplication.id,
        definitionId,
        spaceId,
      })
    : null;
}

/**
 * 現在のスペースで表示可能な申請一覧を取得します。
 */
async function getSpaceApplications({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<ApplicationSummary[]> {
  return getRelayApplications({ authHeaders, groupId: spaceId });
}

/**
 * スペースの表示可能な申請一覧を取得し、権限がない場合は空配列を返します。
 */
async function getSpaceApplicationsIfAvailable({
  authHeaders,
  spaceId,
}: {
  authHeaders: AuthHeaders;
  spaceId: string;
}): Promise<ApplicationSummary[]> {
  try {
    return await getRelayApplications({ authHeaders, groupId: spaceId });
  } catch (error) {
    if (isApiFailure(error)) {
      return [];
    }
    throw error;
  }
}
