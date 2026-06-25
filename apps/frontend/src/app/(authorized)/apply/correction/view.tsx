import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicCorrectionForm } from "./_components/public-correction-form";
import type {
  PublicCorrectionFormDefinition,
  PublicCorrectionResponse,
} from "./types";

type PublicCorrectionViewProps = {
  correction: PublicCorrectionResponse;
  definition: PublicCorrectionFormDefinition;
  formError?: string;
};

/**
 * 公開差戻し修正の再提出完了状態を表示します。
 */
export function PublicCorrectionResubmittedView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>再提出しました</CardTitle>
          <CardDescription>
            修正内容を受け付けました。審査結果の案内をお待ちください。
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

/**
 * 公開差戻し修正フォーム画面を表示します。
 */
export function PublicCorrectionView({
  correction,
  definition,
  formError,
}: PublicCorrectionViewProps) {
  const openCorrection = correction.openCorrection;
  const formFields = definition.fields ?? [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{definition.name}</CardTitle>
            <CardDescription>
              差し戻しされた項目を修正して再提出してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openCorrection && openCorrection.items.length > 0 && formFields.length > 0 ? (
              <PublicCorrectionForm
                applicationId={correction.applicationId}
                fields={openCorrection.items}
                formFields={formFields}
                values={correction.values}
                initialFormError={formError}
                openCorrection={openCorrection}
              />
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                現在修正できる差し戻し項目はありません。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/**
 * 公開差戻し修正画面のエラー状態を表示します。
 */
export function PublicCorrectionErrorView({ status }: { status?: number }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>修正画面を表示できません</CardTitle>
          <CardDescription>
            {status
              ? `差し戻し修正画面の取得に失敗しました（status: ${status}）`
              : "差し戻し修正画面の取得に失敗しました"}
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
