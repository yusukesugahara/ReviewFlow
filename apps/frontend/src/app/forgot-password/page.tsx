import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function requestPasswordResetAction(formData: FormData): Promise<void> {
  "use server";
  const email = formData.get("email");
  if (typeof email !== "string" || email.trim().length === 0) {
    redirect("/forgot-password?formError=メールアドレスを入力してください");
  }

  const env = getServerAuthEnv();
  const res = await fetch(`${env.apiBaseUrl}/auth/password-reset/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.INTERNAL_API_KEY,
    },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok) {
    redirect(
      "/forgot-password?toast=error&message=パスワード再設定メールの送信に失敗しました",
    );
  }
  redirect("/forgot-password?sent=1");
}

type PageProps = {
  searchParams?: Promise<{ sent?: string; error?: string; formError?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const sent = params.sent === "1";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <Card className="mx-auto w-full max-w-md border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">パスワード再設定</CardTitle>
          <CardDescription>
            登録済みのメールアドレスに再設定用リンクを送信します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
              メールを送信しました。届いたリンクから新しいパスワードを設定してください。
            </div>
          ) : (
            <form action={requestPasswordResetAction} className="space-y-4">
              {params.error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  パスワード再設定メールの送信に失敗しました
                </div>
              ) : null}
              {params.formError ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {params.formError}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full">
                再設定メールを送信
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">ログインへ戻る</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
