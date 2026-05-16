import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { APPLICANT_ACCESS_TOKEN_COOKIE_NAME } from "@/lib/constants/auth.constants";
import { client } from "@/lib/server/backend-fetch";
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

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    formError?: string;
    submitted?: string;
  }>;
};
type ApiFailure = { status: number; body: unknown };

async function applicantHeaders(): Promise<{ "X-Applicant-Access-Token": string } | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(APPLICANT_ACCESS_TOKEN_COOKIE_NAME)?.value;
  return token ? { "X-Applicant-Access-Token": token } : undefined;
}

function isApiFailure(error: unknown): error is ApiFailure {
  return !!error && typeof error === "object" && typeof (error as ApiFailure).status === "number";
}

function errorMessageFromBody(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "submit_failed";
}

async function submitPublicApplicationAction(formData: FormData): Promise<void> {
  "use server";

  const groupId = formData.get("groupId");
  const formDefinitionId = formData.get("formDefinitionId");
  const fieldsJson = formData.get("fieldsJson");

  if (
    typeof groupId !== "string" ||
    typeof formDefinitionId !== "string" ||
    typeof fieldsJson !== "string"
  ) {
    redirect("/apply/form?formError=入力内容を確認してください");
  }

  let fields: DynamicFormField[] = [];
  try {
    const parsed: unknown = JSON.parse(fieldsJson);
    if (Array.isArray(parsed)) {
      fields = parsed.filter(isDynamicFormField);
    }
  } catch {
    redirect("/apply/form?formError=入力内容を確認してください");
  }

  try {
    const response = await client.POST("/public/applications", {
      body: {
        groupId,
        formDefinitionId,
        values: readDynamicValuesFromFormData(fields, formData),
      },
      headers: await applicantHeaders(),
    });
    if (!response.response.ok) {
      throw { status: response.response.status, body: response.error };
    }
  } catch (error) {
    const message =
      isApiFailure(error)
        ? errorMessageFromBody(error.body)
        : "submit_failed";
    const params = new URLSearchParams({
      toast: "error",
      message:
        message === "submit_failed"
          ? "申請の送信に失敗しました"
          : `申請の送信に失敗しました。${message}`,
    });
    redirect(`/apply/form?${params.toString()}`);
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
    const response = await client.GET("/form-definitions/public/current", {
      headers: await applicantHeaders(),
    });
    if (!response.response.ok || !response.data) {
      throw { status: response.response.status, body: response.error };
    }
    const definition = unwrapData<FormDefinition>(response.data);
    const fields = definition.fields ?? [];

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
              {query.formError ? (
                <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {query.formError}
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
              {isApiFailure(error)
                ? `申請フォームの取得に失敗しました（status: ${error.status}）`
                : "申請フォームの取得に失敗しました"}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }
}
