import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DynamicFieldInput } from "@/app/_components/applications/dynamic-fields";
import { submitPublicApplicationAction } from "./actions";
import type {
  PublicApplicationFormErrorViewProps,
  PublicApplicationFormViewProps,
} from "./types";

export function PublicApplicationSubmittedView() {
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

export function PublicApplicationFormView({
  definition,
  formError,
}: PublicApplicationFormViewProps) {
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
            {formError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </p>
            ) : null}
            <form action={submitPublicApplicationAction} className="space-y-6">
              <input type="hidden" name="groupId" value={definition.groupId} />
              <input type="hidden" name="formDefinitionId" value={definition.id} />
              <input type="hidden" name="fieldsJson" value={JSON.stringify(fields)} />
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
}

export function PublicApplicationFormErrorView({
  status,
}: PublicApplicationFormErrorViewProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>申請フォームを表示できません</CardTitle>
          <CardDescription>
            {status
              ? `申請フォームの取得に失敗しました（status: ${status}）`
              : "申請フォームの取得に失敗しました"}
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
