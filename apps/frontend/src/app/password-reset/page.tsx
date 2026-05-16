import { redirect } from "next/navigation";
import Link from "next/link";
import { client } from "@/lib/server/backend-fetch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

async function confirmPasswordResetAction(formData: FormData): Promise<void> {
  "use server";
  const token = formData.get("token");
  const password = formData.get("password");
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    typeof password !== "string"
  ) {
    redirect("/password-reset?formError=入力内容を確認してください");
  }

  try {
    const response = await client.POST("/auth/password-reset/confirm", {
      body: { token, password },
    });
    if (!response.response.ok) {
      throw new Error("password reset confirm failed");
    }
  } catch {
    const params = new URLSearchParams({
      token,
      toast: "error",
      message:
        "パスワードの再設定に失敗しました。リンクの有効期限を確認してください。",
    });
    redirect(`/password-reset?${params.toString()}`);
  }
  redirect("/login?toast=success&message=パスワードを再設定しました");
}

type PageProps = {
  searchParams?: Promise<{ token?: string; error?: string; formError?: string }>;
};

export default async function PasswordResetPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const token = params.token ?? "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <Card className="mx-auto w-full max-w-md border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">新しいパスワードを設定</CardTitle>
          <CardDescription>
            メールに記載されたリンクからパスワードを再設定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              再設定トークンが見つかりません
            </div>
          ) : (
            <form action={confirmPasswordResetAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              {params.error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  パスワードの再設定に失敗しました。リンクの有効期限を確認してください。
                </div>
              ) : null}
              {params.formError ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {params.formError}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="password">新しいパスワード</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="8文字以上のパスワード"
                />
              </div>
              <Button type="submit" className="w-full">
                パスワードを再設定
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
