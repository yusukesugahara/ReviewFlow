import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DynamicFieldInput,
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "@/app/app/applications/_components/dynamic-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  buildSpaceApplicationDetailHref,
  buildSpaceApplicationNewHref,
  buildSpaceApplicationsHref,
} from "@/features/applications/application-routes";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";

type FormTemplate = {
  id: string;
  groupId: string;
  name: string;
  status: string;
  fields: DynamicFormField[];
};

type ApprovalFlow = {
  id: string;
  formTemplateId: string;
  name: string;
  isActive: boolean;
};

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{ error?: string; templateId?: string }>;
};

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function createApplicationAction(
  spaceId: string,
  formData: FormData,
): Promise<void> {
  "use server";
  const formTemplateId = formData.get("selectedFormTemplateId");
  const approvalFlowId = formData.get("approvalFlowId");
  const fieldsJson = formData.get("selectedFormFieldsJson");
  if (typeof formTemplateId !== "string" || typeof fieldsJson !== "string") {
    redirect(`${buildSpaceApplicationNewHref(spaceId)}?error=invalid_input`);
  }

  let fields: DynamicFormField[];
  try {
    const parsed: unknown = JSON.parse(fieldsJson);
    if (!Array.isArray(parsed)) {
      throw new Error("fields must be array");
    }
    fields = parsed as DynamicFormField[];
  } catch {
    redirect(`${buildSpaceApplicationNewHref(spaceId)}?error=invalid_fields`);
  }
  const values = readDynamicValuesFromFormData(fields, formData);

  const created = await backendAuthFetchJson("/applications", {
    method: "POST",
    body: {
      formTemplateId,
      groupId: spaceId,
      approvalFlowId:
        typeof approvalFlowId === "string" && approvalFlowId.length > 0
          ? approvalFlowId
          : undefined,
      values,
    },
  });
  const app = unwrapData<{ id: string }>(created);
  const listHref = buildSpaceApplicationsHref(spaceId);
  const detailHref =
    buildSpaceApplicationDetailHref({ id: app.id, groupId: spaceId }) ??
    `${listHref}/${encodeURIComponent(app.id)}`;
  revalidatePath(listHref);
  revalidatePath(detailHref);
  redirect(detailHref);
}

export default async function SpaceNewApplicationPage({
  params,
  searchParams,
}: PageProps) {
  const [{ spaceId }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({} as { error?: string; templateId?: string }),
  ]);
  const error = query.error;

  const templatesRaw = await backendAuthFetchJson(
    `/form-templates?groupId=${encodeURIComponent(spaceId)}`,
  );
  const templates =
    unwrapData<{ templates?: FormTemplate[] }>(templatesRaw).templates ?? [];
  const selectedTemplate =
    templates.find((template) => template.id === query.templateId) ??
    templates.find((template) => template.status === "published") ??
    templates[0];
  const selectedTemplateId = selectedTemplate?.id ?? "";

  const flowsRaw = await backendAuthFetchJson(
    `/approval-flows?groupId=${encodeURIComponent(spaceId)}`,
  );
  const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw).flows ?? [];
  const selectableFlows = flows.filter(
    (flow) => flow.formTemplateId === selectedTemplateId,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">申請作成</h2>
          <p className="text-muted-foreground">
            フォーム定義に沿って入力し、下書き申請を作成します
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={buildSpaceApplicationsHref(spaceId)}>申請一覧へ戻る</Link>
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">
              入力エラーです。必須項目と入力形式を確認してください。
            </p>
          </CardContent>
        </Card>
      ) : null}

      {selectedTemplate ? (
        <Card>
          <CardHeader>
            <CardTitle>申請内容入力</CardTitle>
            <CardDescription>
              {selectedTemplate.name} の入力フォームで新規申請を作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createApplicationAction.bind(null, spaceId)}
              className="space-y-6"
            >
              <input
                type="hidden"
                name="selectedFormTemplateId"
                value={selectedTemplate.id}
              />
              <input
                type="hidden"
                name="selectedFormFieldsJson"
                value={JSON.stringify(selectedTemplate.fields)}
              />

              <div className="space-y-2">
                <Label htmlFor="approvalFlowId">承認フロー（任意）</Label>
                <select
                  id="approvalFlowId"
                  name="approvalFlowId"
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">自動選択</option>
                  {selectableFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                {selectedTemplate.fields.map((field) => (
                  <DynamicFieldInput
                    key={field.id}
                    field={field}
                    value={undefined}
                  />
                ))}
              </div>

              <Button type="submit" size="lg">
                申請を作成
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              利用できるフォームテンプレートがありません。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
