import { redirect } from "next/navigation";
import { getServerAuthEnv } from "@/lib/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function requestAccessAction(formData: FormData): Promise<void> {
  "use server";
  const groupId = formData.get("groupId");
  const email = formData.get("email");

  if (typeof groupId !== "string" || typeof email !== "string" || email.trim().length === 0) {
    redirect(`/apply/${encodeURIComponent(String(groupId ?? ""))}?error=invalid_input`);
  }

  const env = getServerAuthEnv();
  const res = await fetch(`${env.apiBaseUrl}/form-definitions/groups/${groupId}/request-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.INTERNAL_API_KEY,
    },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok) {
    redirect(`/apply/${encodeURIComponent(groupId)}?error=send_failed`);
  }

  redirect(`/apply/${encodeURIComponent(groupId)}?sent=1`);
}

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ sent?: string; error?: string }>;
};

export default async function PublicApplicationAccessPage({
  params,
  searchParams,
}: PageProps) {
  const { groupId } = await params;
  const query = (await searchParams) ?? {};
  const sent = query.sent === "1";
  const error = query.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-lg border-slate-200 bg-white shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-slate-900">申請フォームの案内を受け取る</CardTitle>
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
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              送信に失敗しました。時間をおいて再度お試しください。
            </div>
          ) : null}

          <form action={requestAccessAction} className="space-y-4">
            <input type="hidden" name="groupId" value={groupId} />
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
