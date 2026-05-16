import Link from "next/link";
import {
  ApplicationSetupDraftForm,
  type ApprovalAssigneeOption,
  type DraftField,
} from "@/app/space/_components/application-setup-draft-form";
import type { ApprovalStepItem } from "@/app/space/_components/approval-steps-builder";
import { updateApplicationSetupAction } from "@/app/space/application-setup/actions";
import { redirect } from "next/navigation";
import { client } from "@/lib/server/backend-fetch";
import { getAccessTokenFromCookie } from "@/lib/server/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  APPLICATION_SETUP_ERROR_MESSAGES,
  type ApplicationSetupError,
} from "@/lib/constants/application-setup";
import { FIELD_TYPES, type FieldType } from "@/lib/constants/form-fields";

type ApplicationDetail = {
  approvalFlowId?: string;
  formDefinitionId?: string;
  id: string;
  groupId?: string | null;
  status: string;
  values: Record<string, unknown>;
};

type FormDefinition = {
  fields?: FormField[];
  name?: string;
};

type FormField = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown[] | null;
};

type ApprovalFlow = {
  id: string;
  steps?: {
    id: string;
    stepName: string;
    assigneeUserId?: string;
    assigneeUserIds?: string[];
    canReturn: boolean;
  }[];
};

type GroupMemberSummary = {
  email: string;
  name: string | null;
  userId: string;
};

type PageProps = {
  params: Promise<{ spaceId: string; applicationId: string }>;
  searchParams?: Promise<{
    definitionId?: string;
    setupError?: string;
    setupErrorDetail?: string;
  }>;
};
type ApiFailure = { status: number };

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

function isApiFailure(error: unknown): error is ApiFailure {
  return !!error && typeof error === "object" && typeof (error as ApiFailure).status === "number";
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

function toDraftFields(fields: FormField[]): DraftField[] {
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

function toInitialSteps(flow: ApprovalFlow | null): ApprovalStepItem[] {
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
}: PageProps) {
  const [{ spaceId, applicationId }, query] = await Promise.all([
    params,
    searchParams ??
      Promise.resolve({} as Awaited<NonNullable<PageProps["searchParams"]>>),
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
    const app = unwrapData<ApplicationDetail>(appRaw.data);
    if (
      !(
        app.status === "draft" ||
        app.status === "published"
      )
    ) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">この申請は編集できません</p>
          </CardContent>
        </Card>
      );
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
      ? unwrapData<FormDefinition>(templateRaw.data)
      : (unwrapData<{ definitions?: FormDefinition[] }>(templateRaw.data)
          .definitions?.[0] ?? null);
    const fields = definition?.fields ?? [];
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
      unwrapData<{ members?: GroupMemberSummary[] }>(membersRaw.data).members ?? [];
    const assignees: ApprovalAssigneeOption[] = members.map((member) => ({
      id: member.userId,
      label: member.name ? `${member.name} (${member.email})` : member.email,
    }));
    const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw.data).flows ?? [];
    const currentFlow =
      flows.find((flow) => flow.id === app.approvalFlowId) ?? null;
    const detailPath = `/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}`;
    const editPath = `${detailPath}/edit${
      definitionId ? `?definitionId=${encodeURIComponent(definitionId)}` : ""
    }`;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">申請編集</h2>
            <p className="text-muted-foreground">
              申請内容を編集します
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={detailPath}>
              詳細へ戻る
            </Link>
          </Button>
        </div>
        <ApplicationSetupDraftForm
          action={updateApplicationSetupAction.bind(null, applicationId)}
          assignees={assignees}
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
      </div>
    );
  } catch (error) {
    if (isApiFailure(error)) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              申請編集画面の取得に失敗しました（status: {error.status}）
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">申請編集画面の取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }
}
