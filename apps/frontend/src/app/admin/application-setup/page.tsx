import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminApplicationSetupPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">申請作成</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-slate-600 md:text-[16px]">
          申請を運用するために、フォームテンプレートと承認フローを順番に設定します。
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="h-full border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">1. フォーム作成</CardTitle>
            <CardDescription>
              申請で入力する項目（フィールド）を定義します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              まずテンプレート名を作成し、必要な入力項目を追加して公開します。
            </p>
            <Button asChild>
              <Link href="/admin/form-templates">フォーム作成へ</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">2. 承認フロー作成</CardTitle>
            <CardDescription>
              誰がどの順番で承認するかを設定します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              公開済みフォームを選び、ステップを追加して承認順序を確定します。
            </p>
            <Button asChild>
              <Link href="/admin/approval-flows">承認フロー作成へ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
