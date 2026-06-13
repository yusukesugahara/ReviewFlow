import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicApplicationForm } from "./_components/public-application-form";
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
            <PublicApplicationForm definition={definition} initialFormError={formError} />
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
