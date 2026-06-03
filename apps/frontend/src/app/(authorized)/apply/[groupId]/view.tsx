import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestAccessAction } from "./actions";
import type { PublicApplicationAccessViewProps } from "./types";

export function PublicApplicationAccessView({
  groupId,
  sent,
  formError,
  formDefinitionId,
}: PublicApplicationAccessViewProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-lg border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-slate-900">
            申請フォームの案内を受け取る
          </CardTitle>
          <CardDescription className="text-slate-600">
            メールアドレスを入力すると、申請フォームへ進むための案内を送信します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              入力されたメールアドレス宛に案内を送信しました。受信メールから申請を開始してください。
            </div>
          ) : null}
          {formError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          <form action={requestAccessAction} className="space-y-4">
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="formDefinitionId" value={formDefinitionId} />
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="user@example.com"
              />
            </div>
            <Button type="submit" className="w-full">
              フォーム案内を送信
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
