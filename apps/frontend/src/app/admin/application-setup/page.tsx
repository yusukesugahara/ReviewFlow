import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminApplicationSetupPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">申請作成</h2>
        <p className="max-w-2xl text-[15px] leading-6 text-slate-600 md:text-[16px]">
          申請を運用するために、フォーム管理・フォーム作成・承認フロー作成を順番に設定します。
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="h-full border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">1. フォーム管理</CardTitle>
            <CardDescription>
              申請フォームの土台となるテンプレートを確認・管理します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              既存テンプレートの状態を確認し、フォーム作成へ進みます。
            </p>
            <Button asChild>
              <Link href="/admin/template-management">フォーム管理へ</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="h-full border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">2. フォーム作成</CardTitle>
            <CardDescription>
              テンプレートに入力項目（フィールド）を定義して公開します。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              作成済みテンプレートを選択し、必要な項目を追加します。
            </p>
            <Button asChild>
              <Link href="/admin/form-templates">フォーム作成へ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">3. 承認フロー作成</CardTitle>
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
  );
}
