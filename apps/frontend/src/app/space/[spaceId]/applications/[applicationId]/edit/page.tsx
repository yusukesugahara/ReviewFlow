import Link from "next/link";
import { backendAuthFetchJson, BackendHttpError } from "@/lib/server/backend-fetch";
import {
  type DynamicFormField,
} from "@/app/_components/applications/dynamic-fields";
import {
  ApplicationSetupDraftForm,
  type ApprovalAssigneeOption,
  type DraftField,
} from "@/app/space/_components/application-setup-draft-form";
import type { ApprovalStepItem } from "@/app/space/_components/approval-steps-builder";
import { submitApplicationSetupAction } from "@/app/space/application-setup/actions";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isFieldType } from "@/lib/constants/form-fields";

type ApplicationDetail = {
  approvalFlowId?: string;
  formDefinitionId?: string;
  id: string;
  groupId?: string | null;
  status: string;
  values: Record<string, unknown>;
};

type FormField = DynamicFormField;

type FormDefinition = {
  fields?: FormField[];
  name?: string;
};

type ApprovalFlow = {
  id: string;
  steps?: Array<{
    id: string;
    stepName: string;
    assigneeUserId: string;
    assigneeUserIds?: string[];
    canReturn: boolean;
  }>;
};

type GroupMemberSummary = {
  email: string;
  name: string | null;
  userId: string;
};

type PageProps = {
  params: Promise<{ spaceId: string; applicationId: string }>;
  searchParams?: Promise<{ definitionId?: string }>;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

function optionTextFromFieldOptions(options: unknown[] | null | undefined): string {
  if (!Array.isArray(options)) {
    return "";
  }
  return options
    .map((option) => {
      if (typeof option === "string") {
        return option;
      }
      if (option && typeof option === "object") {
        const label = (option as { label?: unknown }).label;
        return typeof label === "string" ? label : "";
      }
      return "";
    })
    .filter((label) => label.length > 0)
    .join("\n");
}

function toDraftField(field: FormField, index: number): DraftField {
  return {
    id: field.id || `field-${index + 1}`,
    label: field.label,
    fieldType: isFieldType(field.fieldType) ? field.fieldType : "text",
    required: field.required,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    optionsText: optionTextFromFieldOptions(field.options),
  };
}

function toApprovalStepItem(
  step: NonNullable<ApprovalFlow["steps"]>[number],
  index: number,
): ApprovalStepItem {
  return {
    id: step.id || `step-${index + 1}`,
    stepName: step.stepName,
    assigneeUserIds:
      step.assigneeUserIds && step.assigneeUserIds.length > 0
        ? step.assigneeUserIds
        : [step.assigneeUserId],
    canReturn: step.canReturn,
  };
}

export default async function SpaceApplicationEditPage({
  params,
  searchParams,
}: PageProps) {
  const [{ spaceId, applicationId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { definitionId?: string }),
  ]);
  try {
    const appRaw = await backendAuthFetchJson(`/applications/${applicationId}`);
    const app = unwrapData<ApplicationDetail>(appRaw);
    if (!(app.status === "draft" || app.status === "returned")) {
      return (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">この申請は編集できません</p>
          </CardContent>
        </Card>
      );
    }

    const definitionId = app.formDefinitionId ?? query.definitionId;
    const [templateRaw, flowsRaw, membersRaw] = await Promise.all([
      definitionId
        ? backendAuthFetchJson(`/form-definitions/${definitionId}`)
        : backendAuthFetchJson(
            `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
          ),
      backendAuthFetchJson(`/approval-flows?groupId=${encodeURIComponent(spaceId)}`),
      backendAuthFetchJson(`/groups/${spaceId}/members`),
    ]);
    const definition = definitionId
      ? unwrapData<FormDefinition>(templateRaw)
      : (unwrapData<{ definitions?: FormDefinition[] }>(templateRaw)
          .definitions?.[0] ?? null);
    const fields = definition?.fields ?? [];
    const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw).flows ?? [];
    const approvalFlow = flows.find((flow) => flow.id === app.approvalFlowId);
    const members =
      unwrapData<{ members?: GroupMemberSummary[] }>(membersRaw).members ?? [];
    const assignees: ApprovalAssigneeOption[] = members.map((member) => ({
      id: member.userId,
      label: member.name ? `${member.name} (${member.email})` : member.email,
    }));
    const initialFields = fields.map(toDraftField);
    const initialSteps = (approvalFlow?.steps ?? []).map(toApprovalStepItem);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">申請編集</h2>
            <p className="text-muted-foreground">
              新規作成と同じフォームで申請項目と承認フローを編集します
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/space/${encodeURIComponent(spaceId)}/applications/${encodeURIComponent(applicationId)}`}>
              詳細へ戻る
            </Link>
          </Button>
        </div>
        <ApplicationSetupDraftForm
          action={submitApplicationSetupAction}
          assignees={assignees}
          initialFields={initialFields}
          initialName={definition?.name ?? ""}
          initialSteps={initialSteps}
          returnPath={`/space/${encodeURIComponent(spaceId)}/applications/new`}
          spaceId={spaceId}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof BackendHttpError) {
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
