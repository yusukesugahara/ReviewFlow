import { redirect } from "next/navigation";
import {
  backendApplicantFetchJson,
  BackendHttpError,
  errorMessageFromBody,
} from "@/lib/server/backend-fetch";
import { unwrapData } from "@/lib/server/api-envelope";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DynamicFieldInput,
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "@/app/_components/applications/dynamic-fields";

type FormDefinition = {
  id: string;
  groupId: string;
  name: string;
  description?: string | null;
  fields?: DynamicFormField[];
};

type ApprovalFlowSummary = {
  id: string;
  name: string;
};

type PageProps = {
  searchParams?: Promise<{ error?: string; submitted?: string }>;
};

async function submitPublicApplicationAction(formData: FormData): Promise<void> {
  "use server";

  const groupId = formData.get("groupId");
  const formDefinitionId = formData.get("formDefinitionId");
  const approvalFlowId = formData.get("approvalFlowId");
  const fieldsJson = formData.get("fieldsJson");

  if (
    typeof groupId !== "string" ||
    typeof formDefinitionId !== "string" ||
    typeof fieldsJson !== "string"
  ) {
    redirect("/apply/form?error=invalid_input");
  }

  let fields: DynamicFormField[] = [];
  try {
    const parsed: unknown = JSON.parse(fieldsJson);
    if (Array.isArray(parsed)) {
      fields = parsed.filter(isDynamicFormField);
    }
  } catch {
    redirect("/apply/form?error=invalid_input");
  }

  try {
    await backendApplicantFetchJson("/public/applications", {
      method: "POST",
      body: {
        groupId,
        formDefinitionId,
        approvalFlowId:
          typeof approvalFlowId === "string" && approvalFlowId.length > 0
            ? approvalFlowId
            : undefined,
        values: readDynamicValuesFromFormData(fields, formData),
      },
    });
  } catch (error) {
    const message =
      error instanceof BackendHttpError
        ? encodeURIComponent(errorMessageFromBody(error.body))
        : "submit_failed";
    redirect(`/apply/form?error=${message}`);
  }

  redirect("/apply/form?submitted=1");
}

function isDynamicFormField(value: unknown): value is DynamicFormField {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.fieldKey === "string" &&
    typeof row.label === "string" &&
    typeof row.fieldType === "string"
  );
}

export default async function PublicApplicationFormPage({
  searchParams,
}: PageProps) {
  const query = (await searchParams) ?? {};

  if (query.submitted === "1") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <Card className="w-full max-w-xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>申請を送信しました</CardTitle>
            <CardDescription>
              入力内容を受け付けました。審査結果の案内をお待ちください。
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  try {
    const [definitionRaw, flowsRaw] = await Promise.all([
      backendApplicantFetchJson("/form-definitions/public/current"),
      backendApplicantFetchJson("/form-definitions/public/current/approval-flows"),
    ]);
    const definition = unwrapData<FormDefinition>(definitionRaw);
    const flows =
      unwrapData<{ flows?: ApprovalFlowSummary[] }>(flowsRaw).flows ?? [];
    const fields = definition.fields ?? [];
    const selectedFlowId = flows.length === 1 ? flows[0]?.id : "";

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto w-full max-w-3xl">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">{definition.name}</CardTitle>
              <CardDescription>
                {definition.description ?? "必要事項を入力して申請を送信してください。"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {query.error ? (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  申請の送信に失敗しました。{query.error}
                </p>
              ) : null}
              <form action={submitPublicApplicationAction} className="space-y-6">
                <input type="hidden" name="groupId" value={definition.groupId} />
                <input
                  type="hidden"
                  name="formDefinitionId"
                  value={definition.id}
                />
                <input
                  type="hidden"
                  name="fieldsJson"
                  value={JSON.stringify(fields)}
                />
                {flows.length > 1 ? (
                  <div className="space-y-2">
                    <label htmlFor="approvalFlowId" className="text-sm font-medium">
                      承認フロー
                    </label>
                    <select
                      id="approvalFlowId"
                      name="approvalFlowId"
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">選択してください</option>
                      {flows.map((flow) => (
                        <option key={flow.id} value={flow.id}>
                          {flow.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="hidden"
                    name="approvalFlowId"
                    value={selectedFlowId ?? ""}
                  />
                )}
                {fields.map((field) => (
                  <DynamicFieldInput key={field.id} field={field} value={null} />
                ))}
                <Button type="submit" className="w-full">
                  申請を送信
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  } catch (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <Card className="w-full max-w-xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>申請フォームを表示できません</CardTitle>
            <CardDescription>
              {error instanceof BackendHttpError
                ? `申請フォームの取得に失敗しました（status: ${error.status}）`
                : "申請フォームの取得に失敗しました"}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }
}
