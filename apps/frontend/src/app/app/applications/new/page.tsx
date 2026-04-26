import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendApplicantFetchJson } from "@/lib/server/backend-applicant-fetch";
import {
  DynamicFieldInput,
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "../_components/dynamic-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type FormTemplate = {
  id: string;
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

function unwrapData<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object" || !("data" in raw)) {
    throw new Error("invalid success envelope");
  }
  return (raw as { data: T }).data;
}

async function createApplicationAction(formData: FormData): Promise<void> {
  "use server";
  const formTemplateId = formData.get("selectedFormTemplateId");
  const approvalFlowId = formData.get("approvalFlowId");
  const fieldsJson = formData.get("selectedFormFieldsJson");
  if (typeof formTemplateId !== "string" || typeof fieldsJson !== "string") {
    redirect("/app/applications/new?error=invalid_input");
  }

  let fields: DynamicFormField[];
  try {
    const parsed: unknown = JSON.parse(fieldsJson);
    if (!Array.isArray(parsed)) {
      throw new Error("fields must be array");
    }
    fields = parsed as DynamicFormField[];
  } catch {
    redirect("/app/applications/new?error=invalid_fields");
  }
  const values = readDynamicValuesFromFormData(fields, formData);

  const created = await backendApplicantFetchJson("/public/applications", {
    method: "POST",
    body: {
      formTemplateId,
      approvalFlowId:
        typeof approvalFlowId === "string" && approvalFlowId.length > 0
          ? approvalFlowId
          : undefined,
      values,
    },
  });
  const app = unwrapData<{ id: string }>(created);
  revalidatePath("/app/applications");
  revalidatePath(`/app/applications/${app.id}`);
  redirect("/app/applications");
}

type PageProps = {
  searchParams?: Promise<{ error?: string; templateId?: string }>;
};

export default async function NewApplicationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = params.error;

  const templateRaw = await backendApplicantFetchJson("/form-templates/public/current");
  const selectedTemplate = unwrapData<FormTemplate>(templateRaw);
  const selectedTemplateId = selectedTemplate?.id ?? "";

  const flowsRaw = await backendApplicantFetchJson("/form-templates/public/current/approval-flows");
  const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw).flows ?? [];
  const selectableFlows = flows.filter((f) => f.formTemplateId === selectedTemplateId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">申請作成</h2>
        <p className="text-muted-foreground">
          フォーム定義に沿って入力し、下書き申請を作成します
        </p>
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
            <form action={createApplicationAction} className="space-y-6">
              <input type="hidden" name="selectedFormTemplateId" value={selectedTemplate.id} />
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
                  <DynamicFieldInput key={field.id} field={field} value={undefined} />
                ))}
              </div>

              <Button type="submit" size="lg">申請を作成</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
