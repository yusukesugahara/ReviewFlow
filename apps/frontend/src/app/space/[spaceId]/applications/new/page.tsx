import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DynamicFieldInput,
  readDynamicValuesFromFormData,
  type DynamicFormField,
} from "@/app/_components/applications/dynamic-fields";
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
} from "@/app/_components/applications/application-routes";
import { backendAuthFetchJson } from "@/lib/server/backend-auth-fetch";
import { APPLICATION_STATUSES } from "@/lib/constants/applications";

type FormDefinition = {
  id: string;
  groupId: string;
  name: string;
  status: string;
  fields: DynamicFormField[];
};

type ApprovalFlow = {
  id: string;
  name: string;
  isActive: boolean;
};

type PageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{ error?: string }>;
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
  const approvalFlowId = formData.get("approvalFlowId");
  const fieldsJson = formData.get("selectedFormFieldsJson");
  if (typeof fieldsJson !== "string") {
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
    searchParams ?? Promise.resolve({} as { error?: string }),
  ]);
  const error = query.error;

  const templatesRaw = await backendAuthFetchJson(
    `/form-definitions?groupId=${encodeURIComponent(spaceId)}`,
  );
  const definitions =
    unwrapData<{ definitions?: FormDefinition[] }>(templatesRaw).definitions ?? [];
  const formDefinition =
    definitions.find(
      (definition) => definition.status === APPLICATION_STATUSES.published,
    ) ??
    definitions[0];

  const flowsRaw = await backendAuthFetchJson(
    `/approval-flows?groupId=${encodeURIComponent(spaceId)}`,
  );
  const flows = unwrapData<{ flows?: ApprovalFlow[] }>(flowsRaw).flows ?? [];
  const selectableFlows = flows.filter((flow) => flow.isActive);

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

      {formDefinition ? (
        <Card>
          <CardHeader>
            <CardTitle>申請内容入力</CardTitle>
            <CardDescription>
              {formDefinition.name} の入力フォームで新規申請を作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createApplicationAction.bind(null, spaceId)}
              className="space-y-6"
            >
              <input
                type="hidden"
                name="selectedFormFieldsJson"
                value={JSON.stringify(formDefinition.fields)}
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
                {formDefinition.fields.map((field) => (
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
              利用できるフォーム定義がありません。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
